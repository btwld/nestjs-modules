import {
  And,
  Between,
  Equal,
  type FindOperator,
  type FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  QueryFailedError,
  Raw,
  type Repository,
  type EntityManager,
  type FindOptionsRelations,
  type FindManyOptions,
  type FindOneOptions,
} from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  AppContextHost,
  type AppContextLike,
  type DeepPartial,
  RuntimeException,
  type HookResolverService,
  isObject,
} from '@concepta/nestjs-core';
import {
  isWhereCondition,
  isWhereNever,
  type JoinClause,
  OptimisticLockException,
  type RelationConfig,
  TrxCtx,
  RepositoryAdapter,
  type RepositoryCountOptions,
  type RepositoryCreateOptions,
  type RepositoryDatabaseErrorInterface,
  type RepositoryDeleteOneOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryMetadataInterface,
  type RepositoryRestoreOptions,
  type RepositoryVersionGuardOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryVersionGuardInterface,
  type TransactionScope,
  type WhereClause,
  type WhereCondition,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { TypeOrmEntityNameException } from '../exceptions/typeorm-entity-name.exception.js';
import { TypeOrmUnsupportedDatabaseException } from '../exceptions/typeorm-unsupported-database.exception.js';

import {
  buildEntity,
  buildColumns,
  buildOrder,
  buildRelations,
  buildSelect,
  buildUrn,
} from './typeorm-options.schema.js';

/**
 * Options for constructing a TypeOrmRepository.
 */
export interface TypeOrmRepositoryOptions {
  entityKey: string;
  transactionKey?: string;
  hookResolver?: HookResolverService;
  relationsConfig?: Record<string, RelationConfig>;
  transactionScope?: TransactionScope;
}

/**
 * TypeORM implementation of RepositoryInterface.
 * Wraps a TypeORM Repository with transaction-aware operations.
 */
export class TypeOrmRepository<
  Entity extends PlainLiteralObject,
> extends RepositoryAdapter<Entity> {
  readonly metadata: RepositoryMetadataInterface<Entity>;

  /** How many parameters `like` has bound, so each gets a unique name. */
  private likeParameters = 0;

  constructor(
    private readonly repo: Repository<Entity>,
    private readonly options: TypeOrmRepositoryOptions,
  ) {
    super(options.entityKey, options.hookResolver);

    const entityName = repo.metadata?.name || repo.metadata?.targetName;

    if (!entityName) {
      throw new TypeOrmEntityNameException();
    }

    // TypeORM hands a MongoDB find its options as a native filter, with no
    // find operators or joins, so nothing this driver builds would translate.
    const { options: dataSourceOptions, driver } = repo.manager.dataSource;
    if (dataSourceOptions.type === 'mongodb') {
      throw new TypeOrmUnsupportedDatabaseException(
        entityName,
        dataSourceOptions.type,
      );
    }

    const database = driver.database;
    const entityType = buildEntity(repo.target, entityName);
    const columns = buildColumns<Entity>(repo.metadata.columns);
    const relations = repo.metadata.relations
      ? buildRelations(
          repo.metadata.relations,
          database,
          options.relationsConfig,
        )
      : [];

    this.metadata = {
      name: entityName,
      type: entityType,
      urn: buildUrn(repo.metadata, database),
      columns,
      relations,
    };
  }

  /**
   * A query the database failed, reported with the data source's type and the
   * database client's own error code: `code` where the client sets one
   * (`'23503'` on Postgres, `'SQLITE_CONSTRAINT_FOREIGNKEY'` on SQLite),
   * otherwise its numeric `errno`.
   */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    if (!(error instanceof QueryFailedError)) return undefined;
    const reported: Error = error.driverError;
    const code =
      'code' in reported &&
      (typeof reported.code === 'string' || typeof reported.code === 'number')
        ? reported.code
        : 'errno' in reported && typeof reported.errno === 'number'
          ? reported.errno
          : undefined;
    return {
      database: this.repo.manager.dataSource.options.type,
      code,
      message: reported.message,
    };
  }

  /**
   * Get the repository, using transactional EntityManager if available.
   * Creates the driver transaction lazily on first access via `getOrStart()`.
   */
  protected async getRepo(ctx?: AppContextLike): Promise<Repository<Entity>> {
    if (this.options.transactionKey) {
      const context = AppContextHost.from(ctx);
      if (context.supports(TrxCtx)) {
        const { trx } = context.with(TrxCtx);
        if (trx?.isSupported) {
          const tx = await trx.getOrStart(this.options.transactionKey);
          return tx
            .getClient<EntityManager>()
            .getRepository(this.metadata.type);
        }
      }
    }
    return this.repo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause → TypeORM translation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Translate a WhereClause into TypeORM FindOptionsWhere[].
   *
   * Two-phase approach:
   * 1. Flatten WhereClause AST into DNF (OR of AND-branches) — agnostic
   * 2. Translate each AND-branch to a TypeORM FindOptionsWhere — ORM-specific
   */
  protected translateWhere(
    clause?: WhereClause,
  ): FindOptionsWhere<Entity>[] | undefined {
    if (!clause) return undefined;
    const dnf = this.toDnf(clause);
    // `[[NEVER]]` is toDnf's sole FALSE encoding, so it is the only shape
    // needing special handling here.
    if (dnf.length === 1 && dnf[0].length === 1 && isWhereNever(dnf[0][0])) {
      return [this.neverWhere()];
    }
    return dnf.map((branch) => this.branchToFindOptionsWhere(branch));
  }

  /**
   * An unconditionally-false `FindOptionsWhere` — `WHERE 1 = 0`, not an empty
   * `IN ()` a driver upgrade could stop folding to constant-false. Anchored on
   * an arbitrary column, since the raw expression ignores its value.
   */
  protected neverWhere(): FindOptionsWhere<Entity> {
    const anchor =
      this.getPrimaryColumns()[0] ?? this.metadata.columns[0]?.name;
    if (!anchor) {
      throw new RuntimeException({
        message:
          'Cannot render an always-false where clause for "%s": entity has no columns',
        messageParams: [this.metadata.name],
        fault: 'internal',
      });
    }
    return Object.assign<
      FindOptionsWhere<Entity>,
      Record<string, FindOperator<unknown>>
    >({}, { [anchor]: Raw(() => '1 = 0') });
  }

  /**
   * Convert an AND-branch of WhereClause leaves into a single
   * TypeORM FindOptionsWhere. Same-field conditions are merged
   * with TypeORM And(). Relation-tagged conditions are nested
   * under their relation key.
   */
  protected branchToFindOptionsWhere(
    leaves: WhereClause[],
  ): FindOptionsWhere<Entity> {
    const fields: Record<string, FindOperator<unknown>> = {};
    const relations: Record<string, Record<string, FindOperator<unknown>>> = {};

    for (const leaf of leaves) {
      if (isWhereNever(leaf)) {
        // Unreachable by construction: translateWhere's dnf.length === 1
        // check above catches the only shape toDnf ever produces a never
        // leaf in (see repository-adapter.ts's toDnf invariant). Throwing
        // rather than skipping means a future change that breaks that
        // invariant fails loudly instead of silently widening a scope
        // check to "no constraint".
        throw new RuntimeException({
          message:
            "Unexpected WhereNever leaf outside translateWhere's single-branch case",
          fault: 'internal',
        });
      }

      if (!isWhereCondition(leaf)) {
        throw new RuntimeException({
          message: 'Unexpected where node inside a DNF branch',
          fault: 'internal',
        });
      }

      const op = this.toFindOperator(leaf);

      if (leaf.relation) {
        const nested = (relations[leaf.relation] ??= {});
        nested[leaf.field] = nested[leaf.field]
          ? And(nested[leaf.field], op)
          : op;
      } else {
        const existing = fields[leaf.field];
        fields[leaf.field] = existing ? And(existing, op) : op;
      }
    }

    return Object.assign<
      FindOptionsWhere<Entity>,
      Record<string, FindOperator<unknown>>,
      Record<string, Record<string, FindOperator<unknown>>>
    >({}, fields, relations);
  }

  /**
   * Map a WhereCondition to a TypeORM FindOperator.
   */
  protected toFindOperator(cond: WhereCondition): FindOperator<unknown> {
    const { operator } = cond;
    switch (operator) {
      case WhereOperator.EQ:
        return Equal(cond.value);
      case WhereOperator.NE:
        return Not(Equal(cond.value));
      case WhereOperator.GT:
        return MoreThan(cond.value);
      case WhereOperator.GTE:
        return MoreThanOrEqual(cond.value);
      case WhereOperator.LT:
        return LessThan(cond.value);
      case WhereOperator.LTE:
        return LessThanOrEqual(cond.value);
      case WhereOperator.CONTAINS:
        return this.like('%', cond.value, '%');
      case WhereOperator.NCONTAINS:
        return Not(this.like('%', cond.value, '%'));
      case WhereOperator.STARTS:
        return this.like('', cond.value, '%');
      case WhereOperator.NSTARTS:
        return Not(this.like('', cond.value, '%'));
      case WhereOperator.ENDS:
        return this.like('%', cond.value, '');
      case WhereOperator.NENDS:
        return Not(this.like('%', cond.value, ''));
      case WhereOperator.IN:
        return In(cond.value);
      case WhereOperator.NIN:
        return Not(In(cond.value));
      case WhereOperator.IS_NULL:
        return IsNull();
      case WhereOperator.NOT_NULL:
        return Not(IsNull());
      case WhereOperator.BETWEEN:
        return Between(cond.value[0], cond.value[1]);
      default: {
        const _exhaustive: never = operator;
        void _exhaustive;
        throw new RuntimeException({
          message: 'Unknown where operator "%s"',
          messageParams: [operator],
          fault: 'internal',
        });
      }
    }
  }

  /**
   * `LIKE` matching `value` between `before` and `after`, with `%`, `_` and
   * the escape character in `value` matched as themselves. TypeORM's `Like`
   * cannot name an escape character, and SQLite has no default one. `!`
   * escapes, because a backslash reads differently across SQL dialects.
   *
   * Each call binds its own parameter name, so several in one query never
   * share a value.
   */
  protected like(
    before: string,
    value: string,
    after: string,
  ): FindOperator<unknown> {
    const name = `like${++this.likeParameters}`;
    const escaped = value.replace(/[!%_]/g, '!$&');
    return Raw((column) => `${column} LIKE :${name} ESCAPE '!'`, {
      [name]: `${before}${escaped}${after}`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JoinClause → TypeORM relations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Translate JoinClause[] into TypeORM FindOptionsRelations.
   *
   * A join never narrows rows. TypeORM renders some required relations as an
   * INNER JOIN, which returns the same rows as long as every foreign key points
   * at a row that exists. A relation declared with
   * `createForeignKeyConstraints: false` is at the implementer's risk.
   */
  protected translateJoin(
    join?: JoinClause[],
  ): FindOptionsRelations<Entity> | undefined {
    if (!join?.length) return undefined;
    const relations: Record<string, boolean> = {};
    for (const j of join) {
      relations[j.relation] = true;
    }
    return Object.assign<FindOptionsRelations<Entity>, Record<string, boolean>>(
      {},
      relations,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Internal: build native TypeORM FindOptions from our options
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert RepositoryFindOptions to TypeORM FindManyOptions.
   */
  protected buildNativeFindManyOptions(
    options: RepositoryFindOptions<Entity>,
  ): FindManyOptions<Entity> {
    return {
      ...this.buildNativeFindBaseOptions(options),
      skip: options.skip,
      take: options.take,
    };
  }

  /**
   * Convert RepositoryFindOneOptions to TypeORM FindOneOptions.
   */
  protected buildNativeFindOneOptions(
    options: RepositoryFindOneOptions<Entity>,
  ): FindOneOptions<Entity> {
    return this.buildNativeFindBaseOptions(options);
  }

  private buildNativeFindBaseOptions(
    options: RepositoryFindOneOptions<Entity>,
  ): FindOneOptions<Entity> {
    const where = this.translateWhere(options.where);
    const relations = this.translateJoin(options.join);
    const order = buildOrder<Entity>(options.order ?? []);
    const select = buildSelect<Entity>(options.select ?? []);
    return {
      select,
      where,
      relations,
      order,
      withDeleted: options.withDeleted,
      loadEagerRelations: this.allowsEagerRelations,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Query operations
  // ═══════════════════════════════════════════════════════════════════════════

  protected async doFind(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options.ctx);
    const rows = await repo.find(this.buildNativeFindManyOptions(options));
    return rows.map((row) =>
      this.toResult(row, options, this.allowsEagerRelations),
    );
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    const repo = await this.getRepo(options.ctx);
    const row = await repo.findOne(this.buildNativeFindOneOptions(options));
    return row && this.toResult(row, options, this.allowsEagerRelations);
  }

  protected async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    const repo = await this.getRepo(options.ctx);
    // Joins as a find with the same options does, eager ones included, so a
    // page and its total always describe the same rows.
    return repo.count({
      where: this.translateWhere(options.where),
      relations: this.translateJoin(options.join),
      withDeleted: options.withDeleted,
      loadEagerRelations: this.allowsEagerRelations,
    });
  }

  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const repo = await this.getRepo(options.ctx);
    const [rows, total] = await repo.findAndCount(
      this.buildNativeFindManyOptions(options),
    );
    return [
      rows.map((row) => this.toResult(row, options, this.allowsEagerRelations)),
      total,
    ];
  }

  // Create operations

  protected async doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    return repo.save(this.toEntity(entity));
  }

  protected async doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options?.ctx);
    return repo.save(entities.map((entity) => this.toEntity(entity)));
  }

  // Update operations

  protected async doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    if (options?.versionGuard) {
      return this.saveWithVersionGuard(
        entity,
        data,
        options.versionGuard,
        options.ctx,
      );
    }

    const repo = await this.getRepo(options?.ctx);
    return repo.save(this.toEntity({ ...entity, ...data }));
  }

  /**
   * Inserts, or updates the row the payload's primary key names, through
   * TypeORM's `save()` — so an update that changes the row bumps the version
   * and stamps the update date like every other write, and an
   * `expectedVersion` read before it conflicts afterwards. A version in the
   * payload is ignored for the same reason; the database assigns it.
   *
   * Not transactional: `save()` looks the row up, then inserts or updates it.
   * Two concurrent upserts of the same new key are not merged — the second
   * fails on the primary key.
   */
  protected async doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    const instance = this.toEntity(entity);
    const versionColumn = this.getVersionColumn();
    if (versionColumn) {
      const values: PlainLiteralObject = instance;
      delete values[versionColumn];
    }
    const saved = await repo.save(instance);

    const primaryWhere: FindOptionsWhere<Entity> = {};
    for (const col of this.getPrimaryColumns()) {
      if (saved[col] === undefined) {
        throw new RuntimeException({
          message: 'Upsert of "%s" left primary key column "%s" unset',
          messageParams: [this.metadata.name, col],
          fault: 'internal',
        });
      }
      primaryWhere[col] = saved[col];
    }

    // Identity re-read of the row just written, whatever its delete date, for
    // the columns `save()` did not hand back.
    const result = await repo.findOne({
      where: primaryWhere,
      withDeleted: true,
      loadEagerRelations: false,
    });

    if (!result) {
      throw new RuntimeException({
        message: 'Entity "%s" not found after upsert',
        messageParams: [this.metadata.name],
        fault: 'internal',
      });
    }

    return this.toResult(result, {});
  }

  protected async doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    if (options?.versionGuard) {
      return this.saveWithVersionGuard(
        entity,
        data,
        options.versionGuard,
        options.ctx,
      );
    }

    const repo = await this.getRepo(options?.ctx);
    return repo.save(this.toEntity({ ...entity, ...data }));
  }

  /**
   * Run `op` guarded by an atomic optimistic-lock compare-and-swap on
   * `guard.column`, identifying the row by `entity`'s primary key.
   *
   * `repo.increment(conditions, propertyPath, value)` is used for the guard
   * itself — unlike `repo.createQueryBuilder().update().set(...)`, its
   * `propertyPath` is a plain `string` rather than `QueryDeepPartialEntity<Entity>`,
   * so it doesn't hit the generics wall that makes TypeORM's `.set()`
   * impossible to satisfy for a library-level generic `Entity` type
   * parameter. It performs a single atomic
   * `UPDATE ... SET <column> = <column> + 0 WHERE <primary key> AND <column> = :expected`
   * statement and reports 0 affected rows on a mismatch — exactly the
   * compare-and-swap this needs. The `+ 0` is deliberate, not a typo: it's a
   * pure atomic probe (verified against both this repo's supported drivers
   * — Postgres's `rowCount` and TypeORM's own sqlite driver both report
   * `affected` based on rows *matched* by WHERE, not rows whose value
   * actually changed; MySQL's default `affectedRows` behaves the same only
   * with `CLIENT_FOUND_ROWS` enabled, so on an entity with no other
   * auto-updating column a plain MySQL connection can see a false
   * conflict). It is not side-effect-free on every driver, though: TypeORM
   * also stamps any `@UpdateDateColumn` on the same statement — a real
   * write on a row `op` may be about to hard-delete.
   *
   * That guard statement and `op` are two separate SQL statements, so —
   * unless both run inside one DB transaction — a third writer could still
   * interleave between them and reintroduce a lost update. `TransactionScope.run()`
   * closes that window: it joins the caller's transaction if one is already
   * active (e.g. via `@Transactional()`), or opens a short-lived one scoped
   * to just this call if not, so every caller gets the same guarantee
   * without having to opt in.
   */
  private async withVersionGuard<T>(
    entity: Entity,
    guard: RepositoryVersionGuardInterface<Entity>,
    ctx: PlainLiteralObject | undefined,
    op: (
      repo: Repository<Entity>,
      primaryWhere: FindOptionsWhere<Entity>,
    ) => Promise<T>,
  ): Promise<T> {
    const run = async (txCtx?: AppContextLike): Promise<T> => {
      const repo = await this.getRepo(txCtx);

      const primaryWhere: FindOptionsWhere<Entity> = {};
      for (const col of this.getPrimaryColumns()) {
        primaryWhere[col] = entity[col];
      }

      const lockWhere: FindOptionsWhere<Entity> = { ...primaryWhere };
      lockWhere[guard.column] = guard.value;

      const lockResult = await repo.increment(lockWhere, guard.column, 0);

      if (lockResult.affected === 0) {
        throw new OptimisticLockException(this.metadata.name);
      }

      return op(repo, primaryWhere);
    };

    if (this.options.transactionScope) {
      return this.options.transactionScope.run(ctx ?? {}, (txCtx) =>
        run(txCtx),
      );
    }

    // No TransactionScope wired (a repository constructed by hand rather
    // than through RepositoryModule.forRoot(), which always provides one).
    // If the caller is already inside their own
    // active transaction, the guard and the write still resolve to the
    // same connection via getRepo()/TrxCtx, so it's still safe — only
    // refuse when neither guarantee is present, since running the guard
    // and the write as two separate autocommit statements would silently
    // reopen the exact race this whole mechanism exists to close.
    const alreadyInTransaction = ctx
      ? AppContextHost.from(ctx).supports(TrxCtx)
      : false;

    if (!alreadyInTransaction) {
      throw new RuntimeException({
        message:
          'Optimistic locking for "%s" requires an active transaction — ' +
          'import RepositoryModule.forRoot() so TransactionScope is ' +
          'available, or wrap this call in an existing transaction',
        messageParams: [this.metadata.name],
        fault: 'usage',
      });
    }

    return run(ctx);
  }

  /**
   * `update`/`replace`'s operation for `withVersionGuard`: write `data` over
   * the own columns of a freshly re-read row and save it.
   *
   * The version column is put back to the freshly-read value so a value for
   * it in `data` can never override it. TypeORM only auto-increments a version
   * column when its own diff of the entity finds no other pending change to
   * it, so without this a spoofed `data` value would both survive as written
   * and* suppress the real auto-increment.
   */
  private async saveWithVersionGuard(
    entity: Entity,
    data: DeepPartial<Entity>,
    guard: RepositoryVersionGuardInterface<Entity>,
    ctx: PlainLiteralObject | undefined,
  ): Promise<Entity> {
    return this.withVersionGuard(
      entity,
      guard,
      ctx,
      async (repo, primaryWhere) => {
        // `withDeleted: true` — identity re-read of the row the `increment`
        // guard above just matched (full primary key + version), whatever its
        // delete date, so it cannot come back null for a row that exists.
        //
        // `loadEagerRelations: false` — the row is reduced to its own
        // columns below, so there is no point loading them.
        const fresh = await repo.findOne({
          where: primaryWhere,
          withDeleted: true,
          loadEagerRelations: false,
        });

        if (!fresh) {
          throw new RuntimeException({
            message: 'Entity "%s" not found after update',
            messageParams: [this.metadata.name],
            fault: 'internal',
          });
        }

        // Own columns only: a relation on the row would outrank its foreign
        // key column when saved, and TypeORM's constructor puts one there
        // whenever the class initializes it (`badge = null`).
        const next = this.toEntity({ ...this.toResult(fresh, {}), ...data });
        next[guard.column] = fresh[guard.column];

        return this.toResult(await repo.save(next), {});
      },
    );
  }

  // Delete operations

  protected async doDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    if (options?.versionGuard) {
      return this.withVersionGuard(
        entity,
        options.versionGuard,
        options.ctx,
        (repo) => this.remove(repo, [entity]).then(([deleted]) => deleted),
      );
    }

    const repo = await this.getRepo(options?.ctx);
    const [deleted] = await this.remove(repo, [entity]);
    return deleted;
  }

  protected async doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options?.ctx);
    return this.remove(repo, entities);
  }

  /**
   * Hard-delete `entities`, returning each as named. TypeORM's `remove`
   * clears the primary key on every instance it deletes.
   */
  private async remove(
    repo: Repository<Entity>,
    entities: Entity[],
  ): Promise<Entity[]> {
    await repo.remove(entities.map((entity) => this.toEntity(entity)));
    return entities.map((entity) => this.toEntity(entity));
  }

  protected async doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    if (options?.versionGuard) {
      return this.withVersionGuard(
        entity,
        options.versionGuard,
        options.ctx,
        (repo) => repo.softRemove(this.toEntity(entity)),
      );
    }

    const repo = await this.getRepo(options?.ctx);
    return repo.softRemove(this.toEntity(entity));
  }

  protected async doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    if (options?.versionGuard) {
      return this.withVersionGuard(
        entity,
        options.versionGuard,
        options.ctx,
        (repo) => repo.recover(this.toEntity(entity)),
      );
    }

    const repo = await this.getRepo(options?.ctx);
    return repo.recover(this.toEntity(entity));
  }

  /**
   * `row` holding only what the read asked for: the columns it selected, or
   * all own columns, and each joined relation with its own columns. With
   * `eager`, set by a read that asked TypeORM to load eager relations, the
   * relations TypeORM loads eagerly come back too, as loaded.
   *
   * TypeORM builds a loaded row with the entity's constructor, so a field the
   * class initializes comes back whether or not it was read — a relation the
   * read never joined (`post = null`), or a column `select` left out
   * (`status = 'draft'`). The result keeps the row's class but none of that.
   */
  private toResult(
    row: Entity,
    options: RepositoryFindOneOptions<Entity>,
    eager = false,
  ): Entity {
    const result = this.pick(
      row,
      options.select?.length
        ? options.select.map(String)
        : this.metadata.columns.map((column) => column.name),
    );

    const values: PlainLiteralObject = result;
    const loaded: PlainLiteralObject = row;
    for (const { relation } of options.join ?? []) {
      const declared = this.metadata.relations?.find(
        ({ name }) => name === relation,
      );
      const value: unknown = loaded[relation];
      if (!declared || value === undefined) continue;

      const columns = declared.targetColumns.map((column) => column.name);
      values[relation] = Array.isArray(value)
        ? value.map((related) => this.pickRelated(related, columns))
        : this.pickRelated(value, columns);
    }

    if (eager) {
      const joined = new Set(
        (options.join ?? []).map(({ relation }) => relation),
      );
      for (const { propertyName } of this.repo.metadata.eagerRelations) {
        if (!joined.has(propertyName) && loaded[propertyName] !== undefined) {
          values[propertyName] = loaded[propertyName];
        }
      }
    }

    return result;
  }

  /** A joined relation's value reduced to its own columns; `null` stays. */
  private pickRelated(value: unknown, columns: string[]): unknown {
    if (!isObject(value)) return value;
    const related: PlainLiteralObject = value;
    return this.pick(related, columns);
  }

  /**
   * A new instance of `source`'s class, built without its constructor, with
   * `keys` copied across.
   */
  private pick<T extends PlainLiteralObject>(source: T, keys: string[]): T {
    const picked: T = Object.create(Object.getPrototypeOf(source));
    const from: PlainLiteralObject = source;
    const to: PlainLiteralObject = picked;
    for (const key of keys) {
      if (from[key] !== undefined) to[key] = from[key];
    }
    return picked;
  }

  /**
   * `values` as an instance of the entity class, holding nothing else.
   *
   * TypeORM runs entity listeners only for an instance. The class constructor
   * is not run: a field it initializes (`status = 'draft'`, `post = null`)
   * would otherwise be written as though the caller had sent it.
   */
  private toEntity(values: DeepPartial<Entity>): Entity {
    const entity: Entity = Object.create(this.metadata.type.prototype);
    return Object.assign(entity, values);
  }
}

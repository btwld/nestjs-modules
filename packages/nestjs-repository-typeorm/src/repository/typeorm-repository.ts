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
  Raw,
  type Repository,
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
  isObject,
} from '@concepta/nestjs-core';
import {
  isWhereCondition,
  isWhereNever,
  EntityNotFoundException,
  type JoinClause,
  OptimisticLockException,
  TrxCtx,
  type TransactionScope,
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
  type WhereClause,
  type WhereCondition,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { TypeOrmEntityNameException } from '../exceptions/typeorm-entity-name.exception.js';
import { TypeOrmQueryCacheException } from '../exceptions/typeorm-query-cache.exception.js';
import { TypeOrmUnsupportedDatabaseException } from '../exceptions/typeorm-unsupported-database.exception.js';
import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';
import {
  dataSourceOf,
  describeQueryFailure,
} from '../typeorm-repository.util.js';

import {
  buildEntity,
  buildColumns,
  buildOrder,
  buildRelations,
  buildSelect,
  buildUrn,
  totalFromPage,
} from './typeorm-options.schema.js';
import { type TypeOrmRepositoryOptions } from './typeorm-repository-options.interface.js';

/**
 * TypeORM implementation of RepositoryInterface, shared by every database's
 * adapter. Wraps a TypeORM Repository with transaction-aware operations.
 * Each database's adapter subclasses it, naming the database types it
 * accepts.
 */
export abstract class TypeOrmRepository<
  Entity extends PlainLiteralObject,
> extends RepositoryAdapter<Entity> {
  readonly metadata: RepositoryMetadataInterface<Entity>;

  /** How many parameters `like` has bound, so each gets a unique name. */
  private likeParameters = 0;

  /**
   * @param repo - The TypeORM repository to wrap
   * @param options - The repository's options
   * @param databaseType - The database type the adapter is for; a data
   *   source of any other is refused
   */
  protected constructor(
    private readonly repo: Repository<Entity>,
    private readonly options: TypeOrmRepositoryOptions,
    databaseType: string,
  ) {
    super(options.entityKey, options.hookResolver);

    const entityName = repo.metadata?.name || repo.metadata?.targetName;

    if (!entityName) {
      throw new TypeOrmEntityNameException();
    }

    const { options: dataSourceOptions, driver } = dataSourceOf(repo.manager);
    if (dataSourceOptions.type !== databaseType) {
      throw new TypeOrmUnsupportedDatabaseException(
        entityName,
        dataSourceOptions.type,
        databaseType,
      );
    }
    // Reads that check a write, save()'s own among them, must reach the
    // database; a cache only a query asks for is never asked for here.
    const { cache } = dataSourceOptions;
    if (typeof cache === 'object' && cache.alwaysEnabled === true) {
      throw new TypeOrmQueryCacheException(entityName);
    }

    const database = driver.database;
    const entityType = buildEntity(repo.target, entityName);
    const columns = buildColumns<Entity>(repo.metadata.columns);
    const relations = repo.metadata.relations
      ? buildRelations(repo.metadata.relations, database)
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
   * The key of the transaction this repository's writes join, or undefined
   * for a repository built without one.
   */
  get transactionKey(): string | undefined {
    return this.options.transactionKey;
  }

  /** The name of the data source this repository writes through. */
  get dataSourceName(): string | undefined {
    return this.options.dataSourceName;
  }

  /**
   * The lock the re-read of a row just written takes, in the write's
   * transaction. None by default: the read sees the row as stored. A
   * database whose plain reads in a transaction see its snapshot instead
   * sets one, so the row comes back as stored.
   */
  protected readonly rereadLock?: FindOneOptions<Entity>['lock'];

  /**
   * The lock a write takes on the row it is about to change, in the write's
   * transaction, so no other transaction changes or removes the row before
   * the write saves it. A database with one connection, which runs one
   * transaction at a time, needs none.
   */
  protected readonly rowLock?: FindOneOptions<Entity>['lock'] = {
    mode: 'pessimistic_write',
  };

  /** A query the database failed, as `describeQueryFailure` reports it. */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    return describeQueryFailure(error, dataSourceOf(this.repo.manager));
  }

  /**
   * `work` on the repository of the caller's transaction, started on first
   * use via `getOrStart()`, or, when `ctx` carries none, on the data
   * source's own repository through `outsideTransaction`.
   */
  protected async withRepo<T>(
    ctx: AppContextLike | undefined,
    work: (repo: Repository<Entity>) => Promise<T>,
  ): Promise<T> {
    const repo = await this.transactionRepo(ctx);
    return repo ? work(repo) : this.outsideTransaction(() => work(this.repo));
  }

  /**
   * Runs `work`, a call that takes part in no transaction of the caller's.
   */
  protected outsideTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }

  /** The repository of the transaction `ctx` carries, if it carries one. */
  private async transactionRepo(
    ctx: AppContextLike | undefined,
  ): Promise<Repository<Entity> | undefined> {
    if (this.options.transactionKey) {
      const context = AppContextHost.from(ctx);
      if (context.supports(TrxCtx)) {
        const { trx } = context.with(TrxCtx);
        if (trx?.isSupported) {
          const tx = await trx.getOrStart(this.options.transactionKey);
          if (!(tx instanceof TypeOrmTransaction)) {
            throw new RuntimeException({
              message: 'Transaction "%s" is not a TypeORM transaction',
              messageParams: [this.options.transactionKey],
              fault: 'internal',
            });
          }
          return tx.getClient().getRepository(this.metadata.type);
        }
      }
    }
    return undefined;
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
    const anchor = this.getPrimaryColumn() ?? this.metadata.columns[0]?.name;
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
   * `LIKE` matching `value` between `before` and `after`, with every
   * character `escapeLike` marks matched as itself. TypeORM's `Like`
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
    return Raw((column) => `${column} LIKE :${name} ESCAPE '!'`, {
      [name]: `${before}${this.escapeLike(value)}${after}`,
    });
  }

  /**
   * `value` with each character `LIKE` reads as a pattern preceded by `!`:
   * `%`, `_` and `!` itself.
   */
  protected escapeLike(value: string): string {
    return value.replace(/[!%_]/g, '!$&');
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
    const rows = await this.withRepo(options.ctx, (repo) =>
      repo.find(this.buildNativeFindManyOptions(options)),
    );
    return rows.map((row) =>
      this.toResult(row, options, this.allowsEagerRelations),
    );
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    // TypeORM's findOne() refuses a read with no `where`, which ours allows
    // (the first row in order); it is otherwise this same one-row find.
    const [row] = await this.withRepo(options.ctx, (repo) =>
      repo.find({ ...this.buildNativeFindOneOptions(options), take: 1 }),
    );
    return row ? this.toResult(row, options, this.allowsEagerRelations) : null;
  }

  protected async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    return this.withRepo(options.ctx, (repo) =>
      repo.count(this.buildNativeCountOptions(options)),
    );
  }

  /**
   * A find for the page, then a count of the rows it matches unless the
   * page already tells the total. A select shapes the page and never the
   * count.
   */
  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const findOptions = this.buildNativeFindManyOptions(options);
    const [rows, total] = await this.withRepo(
      options.ctx,
      async (repo): Promise<[Entity[], number]> => {
        const found = await repo.find(findOptions);
        return [
          found,
          totalFromPage(found.length, findOptions.skip, findOptions.take) ??
            (await repo.count(this.buildNativeCountOptions(options))),
        ];
      },
    );
    return [
      rows.map((row) => this.toResult(row, options, this.allowsEagerRelations)),
      total,
    ];
  }

  /**
   * Joins as a find with the same options does, eager ones included, so a
   * page and its total always describe the same rows.
   */
  private buildNativeCountOptions(
    options: RepositoryCountOptions,
  ): FindManyOptions<Entity> {
    return {
      where: this.translateWhere(options.where),
      relations: this.translateJoin(options.join),
      withDeleted: options.withDeleted,
      loadEagerRelations: this.allowsEagerRelations,
    };
  }

  // Create operations

  protected async doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    return this.withRepo(options?.ctx, (repo) =>
      repo.save(this.toEntity(entity)),
    );
  }

  protected async doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    return this.withRepo(options?.ctx, (repo) =>
      repo.save(entities.map((entity) => this.toEntity(entity))),
    );
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
        'update',
      );
    }

    return this.writeData(entity, data, 'update', options?.ctx);
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
    return this.withRepo(options?.ctx, (repo) =>
      this.upsertOn(repo, entity, options?.ctx),
    );
  }

  private async upsertOn(
    repo: Repository<Entity>,
    entity: DeepPartial<Entity>,
    ctx: AppContextLike | undefined,
  ): Promise<Entity> {
    const instance = this.toEntity(entity);
    const versionColumn = this.getVersionColumn();
    if (versionColumn) {
      const values: PlainLiteralObject = instance;
      delete values[versionColumn];
    }
    const saved = await repo.save(instance);

    const primaryWhere: FindOptionsWhere<Entity> = {};
    const primaryColumn = this.getPrimaryColumn();
    if (primaryColumn !== undefined) {
      if (saved[primaryColumn] === undefined) {
        throw new RuntimeException({
          message: 'Upsert of "%s" left primary key column "%s" unset',
          messageParams: [this.metadata.name, primaryColumn],
          fault: 'internal',
        });
      }
      primaryWhere[primaryColumn] = saved[primaryColumn];
    }

    // Identity re-read of the row just written, whatever its delete date, for
    // the columns `save()` did not hand back; locked in the caller's
    // transaction, where a plain read can return the transaction's snapshot.
    const result = await repo.findOne({
      where: primaryWhere,
      withDeleted: true,
      loadEagerRelations: false,
      lock: this.joinsTransaction(ctx) ? this.rereadLock : undefined,
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
        'replace',
      );
    }

    return this.writeData(entity, data, 'replace', options?.ctx);
  }

  /**
   * `update`/`replace`'s write when no version guard applies, in one
   * transaction: a locking read of the row `entity`'s primary key names, so
   * a row no longer stored is not found (`save()` would insert it again),
   * then `save()` of that key and `data`, then a re-read, so the row returned
   * is the row written.
   *
   * `save()` writes only the columns it is given, so a column the caller's
   * `entity` holds a stale value for keeps the value stored by a later
   * writer.
   */
  private async writeData(
    entity: Entity,
    data: DeepPartial<Entity>,
    operation: 'update' | 'replace',
    ctx: PlainLiteralObject | undefined,
  ): Promise<Entity> {
    const primaryColumn = this.getPrimaryColumn();
    if (primaryColumn === undefined) {
      throw new RuntimeException({
        message: 'Cannot %s "%s": the entity has no primary key column',
        messageParams: [operation, this.metadata.name],
        fault: 'usage',
      });
    }

    const primaryWhere: FindOptionsWhere<Entity> = {};
    primaryWhere[primaryColumn] = entity[primaryColumn];

    const run = (txCtx?: AppContextLike): Promise<Entity> =>
      this.withRepo(txCtx, (repo) => write(repo));
    const write = async (repo: Repository<Entity>): Promise<Entity> => {
      if (!(await this.lockRow(repo, primaryWhere))) {
        throw new EntityNotFoundException(this.metadata.name, operation);
      }
      return this.saveData(repo, primaryWhere, data, operation);
    };

    return this.options.transactionScope && !this.joinsTransaction(ctx)
      ? this.inOwnTransaction(this.options.transactionScope, ctx, run)
      : run(ctx);
  }

  /**
   * The row `where` names, whatever its delete date, locked until the
   * transaction ends; `null` when there is none.
   */
  private lockRow(
    repo: Repository<Entity>,
    where: FindOptionsWhere<Entity>,
  ): Promise<Entity | null> {
    return repo.findOne({
      where,
      withDeleted: true,
      loadEagerRelations: false,
      lock: this.rowLock,
    });
  }

  /**
   * The row `where` names, as stored, whatever its delete date; a row no
   * longer stored is not found.
   */
  private async reread(
    repo: Repository<Entity>,
    where: FindOptionsWhere<Entity>,
    operation: string,
  ): Promise<Entity> {
    const row = await repo.findOne({
      where,
      withDeleted: true,
      loadEagerRelations: false,
      lock: this.rereadLock,
    });
    if (!row) {
      throw new EntityNotFoundException(this.metadata.name, operation);
    }
    return this.toResult(row, {});
  }

  /**
   * Whether `ctx` carries the caller's transaction, which a write then
   * joins directly. A run of the driver's own, nested in the caller's,
   * would fail the caller's whole scope on any error it saw.
   */
  private joinsTransaction(ctx: AppContextLike | undefined): boolean {
    const context = AppContextHost.from(ctx);
    return context.supports(TrxCtx) && context.with(TrxCtx).trx.isSupported;
  }

  /**
   * Run `work` in a transaction of its own, opened on a child of `ctx`. The
   * child holds everything the caller's context does, but the transaction
   * never shows on the caller's context, so another call made with that
   * context at the same time takes no part in it.
   */
  private inOwnTransaction<T>(
    scope: TransactionScope,
    ctx: AppContextLike | undefined,
    work: (txCtx: AppContextLike) => Promise<T>,
  ): Promise<T> {
    const child = AppContextHost.from(Object.create(AppContextHost.from(ctx)));
    return scope.run(child, work);
  }

  /**
   * Run `op` guarded by the version in `guard`, identifying the row by
   * `entity`'s primary key.
   *
   * The check is a locking read of the row at the expected version: no row
   * means someone else wrote or removed it first, so it throws
   * `OptimisticLockException`. The lock holds the row until the transaction
   * ends, so no other writer changes it before `op` saves it.
   *
   * The check and `op` run in one transaction: the caller's when one is
   * active (e.g. via `@Transactional()`), or a short-lived one
   * `TransactionScope.run()` opens for just this call, so every caller gets
   * the same guarantee without having to opt in.
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
    const run = (txCtx?: AppContextLike): Promise<T> =>
      this.withRepo(txCtx, (repo) => guarded(repo));
    const guarded = async (repo: Repository<Entity>): Promise<T> => {
      const primaryWhere: FindOptionsWhere<Entity> = {};
      const primaryColumn = this.getPrimaryColumn();
      if (primaryColumn !== undefined) {
        primaryWhere[primaryColumn] = entity[primaryColumn];
      }

      const lockWhere: FindOptionsWhere<Entity> = { ...primaryWhere };
      lockWhere[guard.column] = guard.value;

      if (!(await this.lockRow(repo, lockWhere))) {
        throw new OptimisticLockException(this.metadata.name);
      }

      return op(repo, primaryWhere);
    };

    if (this.joinsTransaction(ctx)) {
      return run(ctx);
    }
    if (this.options.transactionScope) {
      return this.inOwnTransaction(this.options.transactionScope, ctx, run);
    }

    // No TransactionScope wired (a repository constructed by hand rather
    // than through RepositoryModule.forRoot(), which always provides one).
    // If the caller is already inside their own
    // active transaction, the guard and the write still resolve to the
    // same connection via withRepo()/TrxCtx, so it's still safe — only
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

  /** `update`/`replace` of a versioned entity: `saveData` under the guard. */
  private async saveWithVersionGuard(
    entity: Entity,
    data: DeepPartial<Entity>,
    guard: RepositoryVersionGuardInterface<Entity>,
    ctx: PlainLiteralObject | undefined,
    operation: 'update' | 'replace',
  ): Promise<Entity> {
    return this.withVersionGuard(entity, guard, ctx, (repo, primaryWhere) =>
      this.saveData(repo, primaryWhere, data, operation),
    );
  }

  /**
   * `save()` of the row's key and `data`, then the row as stored. TypeORM
   * writes the columns of `data` that differ from the row as it reads it,
   * and moves the version itself; a value for the version in `data` is
   * dropped, so it can neither be written nor hold the version back.
   */
  private async saveData(
    repo: Repository<Entity>,
    primaryWhere: FindOptionsWhere<Entity>,
    data: DeepPartial<Entity>,
    operation: 'update' | 'replace',
  ): Promise<Entity> {
    const row = this.toEntity(data);
    const values: PlainLiteralObject = row;
    Object.assign(values, primaryWhere);
    const versionColumn = this.getVersionColumn();
    if (versionColumn) delete values[versionColumn];
    await repo.save(row);
    return this.reread(repo, primaryWhere, operation);
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

    const [deleted] = await this.withRepo(options?.ctx, (repo) =>
      this.remove(repo, [entity]),
    );
    return deleted;
  }

  protected async doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    return this.withRepo(options?.ctx, (repo) => this.remove(repo, entities));
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
    return this.setRemoved(entity, 'softDelete', options);
  }

  protected async doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    return this.setRemoved(entity, 'restore', options);
  }

  /**
   * `softDelete`/`restore`'s write, in one transaction: a locking read of
   * the row `entity`'s primary key names, so a row no longer stored is not
   * found, then `softRemove()`/`recover()` of the row as stored, then a
   * re-read, so the row returned is the row as stored rather than the
   * caller's copy. Guarded by the version when the caller states one.
   */
  private async setRemoved(
    entity: Entity,
    operation: 'softDelete' | 'restore',
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    const write = async (
      repo: Repository<Entity>,
      primaryWhere: FindOptionsWhere<Entity>,
    ): Promise<Entity> => {
      const stored = await this.lockRow(repo, primaryWhere);
      if (!stored) {
        throw new EntityNotFoundException(this.metadata.name, operation);
      }
      // Own columns only, as for a versioned save.
      const row = this.toEntity(this.toResult(stored, {}));
      await (operation === 'softDelete'
        ? repo.softRemove(row)
        : repo.recover(row));
      return this.reread(repo, primaryWhere, operation);
    };

    if (options?.versionGuard) {
      return this.withVersionGuard(
        entity,
        options.versionGuard,
        options.ctx,
        write,
      );
    }

    const primaryColumn = this.getPrimaryColumn();
    const primaryWhere: FindOptionsWhere<Entity> = {};
    if (primaryColumn !== undefined) {
      primaryWhere[primaryColumn] = entity[primaryColumn];
    }
    const ctx = options?.ctx;
    const run = (txCtx?: AppContextLike): Promise<Entity> =>
      this.withRepo(txCtx, (repo) => write(repo, primaryWhere));
    return this.options.transactionScope && !this.joinsTransaction(ctx)
      ? this.inOwnTransaction(this.options.transactionScope, ctx, run)
      : run(ctx);
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

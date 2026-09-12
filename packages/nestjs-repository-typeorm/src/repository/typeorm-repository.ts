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
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
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
} from '@concepta/nestjs-core';
import {
  isWhereCondition,
  type JoinClause,
  OptimisticLockException,
  type RelationActionConfig,
  TrxCtx,
  RepositoryAdapter,
  type RepositoryCreateOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryMetadataInterface,
  type RepositoryRestoreOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type TransactionScope,
  type WhereClause,
  type WhereCondition,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { TypeOrmEntityNameException } from '../exceptions/typeorm-entity-name.exception.js';

import {
  buildEntity,
  buildColumns,
  buildOrder,
  buildRelations,
} from './typeorm-options.schema.js';

/**
 * Options for constructing a TypeOrmRepository.
 */
export interface TypeOrmRepositoryOptions {
  entityKey: string;
  transactionKey?: string;
  hookResolver?: HookResolverService;
  relationsConfig?: Record<string, RelationActionConfig>;
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

  constructor(
    private readonly repo: Repository<Entity>,
    private readonly options: TypeOrmRepositoryOptions,
  ) {
    super(options.entityKey, options.hookResolver);

    const entityName = repo.metadata?.name || repo.metadata?.targetName;

    if (!entityName) {
      throw new TypeOrmEntityNameException();
    }

    const entityType = buildEntity(repo.target, entityName);
    const columns = buildColumns<Entity>(repo.metadata.columns);
    const relations = repo.metadata.relations
      ? buildRelations(repo.metadata.relations, options.relationsConfig)
      : [];

    this.metadata = {
      name: entityName,
      type: entityType,
      columns,
      relations,
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
    if (dnf.length === 0) return undefined;
    return dnf.map((branch) => this.branchToFindOptionsWhere(branch));
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
      if (!isWhereCondition(leaf)) continue;

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
        return Like(`%${cond.value}%`);
      case WhereOperator.NCONTAINS:
        return Not(Like(`%${cond.value}%`));
      case WhereOperator.STARTS:
        return Like(`${cond.value}%`);
      case WhereOperator.NSTARTS:
        return Not(Like(`${cond.value}%`));
      case WhereOperator.ENDS:
        return Like(`%${cond.value}`);
      case WhereOperator.NENDS:
        return Not(Like(`%${cond.value}`));
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

  // ═══════════════════════════════════════════════════════════════════════════
  // JoinClause → TypeORM relations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Translate JoinClause[] into TypeORM FindOptionsRelations.
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
    const resolvedJoin = this.resolveJoinClauses(options.join);
    const where = this.translateWhere(options.where);
    const relations = this.translateJoin(resolvedJoin);
    const order = buildOrder<Entity>(options.order ?? []);
    return {
      select: options.select,
      where,
      relations,
      order,
      withDeleted: options.withDeleted,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Query operations
  // ═══════════════════════════════════════════════════════════════════════════

  protected async doFind(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options.ctx);
    return repo.find(this.buildNativeFindManyOptions(options));
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    const repo = await this.getRepo(options.ctx);
    return repo.findOne(this.buildNativeFindOneOptions(options));
  }

  protected async doCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<number> {
    const repo = await this.getRepo(options.ctx);
    return repo.count(this.buildNativeFindManyOptions(options));
  }

  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const repo = await this.getRepo(options.ctx);
    return repo.findAndCount(this.buildNativeFindManyOptions(options));
  }

  // Create operations

  protected async doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    return repo.save(entity);
  }

  protected async doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options?.ctx);
    return repo.save(entities);
  }

  // Update operations

  protected async doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    const versionColumn = this.getVersionColumn();

    if (versionColumn) {
      return this.saveWithVersionCheck(
        entity,
        data,
        versionColumn,
        options?.ctx,
      );
    }

    const repo = await this.getRepo(options?.ctx);
    const merged = repo.merge(entity, data);
    return repo.save(merged);
  }

  protected async doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    const conflictPaths = this.getPrimaryColumns();
    const entityInstance = repo.create(entity);
    const insertResult = await repo.upsert(entityInstance, conflictPaths);

    const identifiers = insertResult.identifiers[0] ?? {};
    const primaryKeys: Partial<Record<keyof Entity, Entity[keyof Entity]>> = {};

    for (const col of conflictPaths) {
      const value = identifiers[col] ?? entityInstance[col];

      if (value === undefined) {
        throw new Error(`Upsert requires primary key "${col}" to be set`);
      }

      primaryKeys[col] = value;
    }

    // `withDeleted: true` — identity re-read of the row `repo.upsert()` just
    // wrote; it may legitimately be soft-deleted (e.g. via `{ force: true }`
    // at the abstraction level). See `saveWithVersionCheck` below.
    const result = await repo.findOne({
      where: primaryKeys,
      withDeleted: true,
    });

    if (!result) {
      throw new Error('Upsert failed: entity not found after upsert');
    }

    return result;
  }

  protected async doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    const versionColumn = this.getVersionColumn();

    if (versionColumn) {
      return this.saveWithVersionCheck(
        entity,
        data,
        versionColumn,
        options?.ctx,
      );
    }

    const repo = await this.getRepo(options?.ctx);
    const replaced = repo.merge(entity, data);
    return repo.save(replaced);
  }

  /**
   * Persist `data` onto `entity` guarded by an atomic optimistic-lock check
   * on the version column read at fetch time.
   *
   * `repo.increment(conditions, propertyPath, value)` is used for the guard
   * itself — unlike `repo.createQueryBuilder().update().set(...)`, its
   * `propertyPath` is a plain `string` rather than `QueryDeepPartialEntity<Entity>`,
   * so it doesn't hit the generics wall that makes TypeORM's `.set()`
   * impossible to satisfy for a library-level generic `Entity` type
   * parameter. It performs a single atomic
   * `UPDATE ... SET version = version + 0 WHERE id = :id AND version = :expected`
   * statement and reports 0 affected rows on a mismatch — exactly the
   * compare-and-swap this needs. The `+ 0` is deliberate, not a typo: it's a
   * pure atomic check with no real effect of its own (verified against both
   * this repo's supported drivers — Postgres's `rowCount` and TypeORM's own
   * sqlite driver both report `affected` based on rows *matched* by WHERE,
   * not rows whose value actually changed, unlike MySQL's default
   * behavior). The real, sole version bump happens in the `repo.save()`
   * below — `@VersionColumn` entities auto-increment on every `save()`
   * regardless of whether the value you hand it changed, so doing a real
   * `+1` here as well would double-bump every successful update.
   *
   * That guard statement and the follow-up field write are two separate SQL
   * statements, so — unless both run inside one DB transaction — a third
   * writer could still interleave between them and reintroduce a lost
   * update. `TransactionScope.run()` closes that window: it joins the
   * caller's transaction if one is already active (e.g. via
   * `@Transactional()`), or opens a short-lived one scoped to just this
   * call if not, so every caller gets the same guarantee without having to
   * opt in.
   *
   * `merged[versionColumn]` is forced back to the freshly-read value
   * immediately after merging so a client-supplied `version` in `data` can
   * never override it — `repo.save()`'s own auto-increment is what actually
   * advances it from there.
   */
  private async saveWithVersionCheck(
    entity: Entity,
    data: DeepPartial<Entity>,
    versionColumn: keyof Entity & string,
    ctx?: PlainLiteralObject,
  ): Promise<Entity> {
    const run = async (txCtx?: AppContextLike): Promise<Entity> => {
      const repo = await this.getRepo(txCtx);

      const primaryWhere: FindOptionsWhere<Entity> = {};
      for (const col of this.getPrimaryColumns()) {
        primaryWhere[col] = entity[col];
      }

      const lockWhere: FindOptionsWhere<Entity> = { ...primaryWhere };
      lockWhere[versionColumn] = entity[versionColumn];

      const lockResult = await repo.increment(lockWhere, versionColumn, 0);

      if (lockResult.affected === 0) {
        throw new OptimisticLockException(this.metadata.name);
      }

      // `withDeleted: true` — identity re-read of the row the `increment`
      // guard above just matched (full primary key + version); it may
      // legitimately be soft-deleted (e.g. via `{ force: true }` at the
      // abstraction level), and without this it would wrongly come back
      // null and throw below for a row that demonstrably exists (#471).
      const fresh = await repo.findOne({
        where: primaryWhere,
        withDeleted: true,
      });

      if (!fresh) {
        throw new RuntimeException({
          message: 'Entity "%s" not found after update',
          messageParams: [this.metadata.name],
          fault: 'internal',
        });
      }

      // `repo.merge()` mutates `fresh` in place and returns the same
      // reference, so the true version must be captured *before* merging —
      // reading `fresh[versionColumn]` afterward would just be reading back
      // whatever `data` already overwrote it with.
      const trueVersion = fresh[versionColumn];
      const merged = repo.merge(fresh, data);
      merged[versionColumn] = trueVersion;

      return repo.save(merged);
    };

    if (this.options.transactionScope) {
      return this.options.transactionScope.run(ctx ?? {}, (txCtx) =>
        run(txCtx),
      );
    }

    // No TransactionScope wired (e.g. TypeOrmRepositoryModule used directly,
    // without RepositoryModule.forRoot() — TransactionScope is only
    // provided by the latter). If the caller is already inside their own
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

  // Delete operations

  protected async doDelete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    return repo.remove(entity);
  }

  protected async doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    const repo = await this.getRepo(options?.ctx);
    return repo.remove(entities);
  }

  protected async doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    return repo.softRemove(entity);
  }

  protected async doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions,
  ): Promise<Entity> {
    const repo = await this.getRepo(options?.ctx);
    return repo.recover(entity);
  }

  // Utility methods

  transform(entityLike: DeepPartial<Entity>): Entity {
    return this.repo.create(entityLike);
  }

  merge(
    mergeIntoEntity: Entity,
    ...entityLikes: DeepPartial<Entity>[]
  ): Entity {
    return this.repo.merge(mergeIntoEntity, ...entityLikes);
  }
}

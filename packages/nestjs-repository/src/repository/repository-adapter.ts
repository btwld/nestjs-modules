import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import {
  AppContextHost,
  type DeepPartial,
  isObject,
  RuntimeException,
  type HookMethodFilter,
  type HookMethodKeyType,
  type HookResolverService,
} from '@concepta/nestjs-core';

import { RepoCtx } from '../context/interfaces/repository-context.interface.js';
import { type FederationOrchestrator } from '../federation/federation-orchestrator.service.js';
import { RepoPermeatorFactory } from '../hooks/repo-permeator-factory.js';
import { RepoHook } from '../hooks/repository-hook.decorators.js';

import { type JoinClause } from './interfaces/join-clause.interface.js';
import { type RepositoryMetadataInterface } from './interfaces/repository-metadata.interface.js';
import {
  type RepositoryFindOptions,
  type RepositoryFindOneOptions,
  type RepositoryCreateOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryDeleteOptions,
  type RepositoryRestoreOptions,
} from './interfaces/repository-options.interface.js';
import { type RepositoryInterface } from './interfaces/repository.interface.js';
import {
  type WhereClause,
  isWhereCondition,
  isWhereCompound,
} from './interfaces/where-clause.interface.js';
import { WhereCompoundOperator } from './repository.types.js';

// Module-scoped: the root cause (CoreModule not imported) is identical no
// matter how many repositories/entities hit it, so warn once per process
// rather than once per repository construction.
let warnedHooksNotWired = false;

/**
 * Abstract repository adapter that implements entity hydration.
 *
 * Concrete repository implementations should extend this class.
 *
 * @example
 * ```typescript
 * class TypeOrmRepository<Entity> extends RepositoryAdapter<Entity> {
 *   async find(options?) {
 *     return await this.repo.find(options);
 *   }
 *
 *   async create(entity, options?) {
 *     return await this.repo.save(entity);
 *   }
 * }
 * ```
 */
export abstract class RepositoryAdapter<
  Entity extends PlainLiteralObject,
> implements RepositoryInterface<Entity> {
  abstract readonly metadata: RepositoryMetadataInterface<Entity>;

  readonly entityKey: string;

  private _permeator?: RepoPermeatorFactory<Entity>;
  private _federationOrchestrator?: FederationOrchestrator;

  constructor(
    entityKey: string,
    protected readonly hookResolver?: HookResolverService,
  ) {
    this.entityKey = entityKey;

    if (!hookResolver && !warnedHooksNotWired) {
      warnedHooksNotWired = true;
      process.emitWarning(
        `Repository "${entityKey}" was constructed without a HookResolverService — ` +
          'hooks registered via @UseHooks() will never run for this repository ' +
          '(or any other, until CoreModule is imported), silently. Import ' +
          'CoreModule (e.g. CoreModule.forRoot()) to enable them.',
        { code: 'ROCKETS_HOOKS_NOT_WIRED' },
      );
    }
  }

  /**
   * Set the federation orchestrator for this repository.
   * When set, `findAndCount` will delegate to the orchestrator
   * for queries that include federated joins.
   */
  setFederationOrchestrator(orchestrator: FederationOrchestrator): void {
    this._federationOrchestrator = orchestrator;
  }

  protected get permeator(): RepoPermeatorFactory<Entity> {
    if (!this._permeator) {
      this._permeator = new RepoPermeatorFactory<Entity>(
        this.runHooks.bind(this),
        this.entityKey,
      );
    }
    return this._permeator;
  }

  /**
   * Build the ambient context for hook execution.
   *
   * Chains overlays via prototype inheritance so that hook methods
   * can access locals, hooks, entity, and trx through the chain.
   *
   * `entity` is installed on a fresh child scoped to this one call, not on
   * `ctx` itself — unlike trx/hooks (stable for the whole scope/request),
   * it differs per repository per call, so it can't use `defineOverlay`'s
   * idempotent "declare once" semantics without pinning to whichever
   * repository happened to touch `ctx` first.
   */
  protected entityCtx(
    ctx?: PlainLiteralObject,
  ): PlainLiteralObject | undefined {
    if (!ctx) return undefined;
    const appCtx = AppContextHost.from(ctx);

    const repoScoped = AppContextHost.from(Object.create(appCtx));
    repoScoped.defineOverlay(RepoCtx, { entity: this.entityKey });

    return repoScoped
      .require(RepoCtx)
      .withRepo()
      .optional()
      .withHooks()
      .optional()
      .withTrx();
  }

  // Query operations

  async find(options: RepositoryFindOptions<Entity> = {}): Promise<Entity[]> {
    return this.permeator.find.permeate(
      options,
      (scoped) => this.doFind(scoped),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFind(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<Entity[]>;

  async findOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    return this.permeator.findOne.permeate(
      options,
      (scoped) => this.doFindOne(scoped),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null>;

  async count(options: RepositoryFindOptions<Entity> = {}): Promise<number> {
    return this.permeator.count.permeate(
      options,
      (scoped) => this.doCount(scoped),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doCount(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<number>;

  /**
   * Find entities and return with total count.
   *
   * When a federation orchestrator is set and the query includes
   * joins targeting `federated: true` relations, delegates to the
   * orchestrator for cross-entity query orchestration.
   */
  async findAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    if (this._federationOrchestrator && this.hasFederatedJoins(options?.join)) {
      return this._federationOrchestrator.findAndCount(this, options);
    }
    return this.permeator.findAndCount.permeate(
      options,
      (scoped) => this.doFindAndCount(scoped),
      this.entityCtx(options.ctx),
    );
  }

  protected abstract doFindAndCount(
    options?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]>;

  // Create operations

  async create(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    return this.permeator.create.permeate(
      entity,
      (scoped) => this.doCreate(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity>;

  async createMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    return this.permeator.createMany.permeate(
      entities,
      (scoped) => this.doCreateMany(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]>;

  // Update operations

  async update(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    return this.permeator.update.permeate(
      data,
      (scoped) => this.doUpdate(entity, scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity>;

  async upsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    return this.permeator.upsert.permeate(
      entity,
      (scoped) => this.doUpsert(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity>;

  async replace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity> {
    return this.permeator.replace.permeate(
      data,
      (scoped) => this.doReplace(entity, scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions,
  ): Promise<Entity>;

  // Delete operations

  async delete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity> {
    return this.permeator.delete.permeate(
      entity,
      (scoped) => this.doDelete(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doDelete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity>;

  async deleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    return this.permeator.deleteMany.permeate(
      entities,
      (scoped) => this.doDeleteMany(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]>;

  async softDelete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity> {
    return this.permeator.softDelete.permeate(
      entity,
      (scoped) => this.doSoftDelete(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOptions,
  ): Promise<Entity>;

  async restore(
    entity: Entity,
    options?: RepositoryRestoreOptions,
  ): Promise<Entity> {
    return this.permeator.restore.permeate(
      entity,
      (scoped) => this.doRestore(scoped, options),
      this.entityCtx(options?.ctx),
    );
  }

  protected abstract doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions,
  ): Promise<Entity>;

  // Utility methods

  abstract transform(entityLike: DeepPartial<Entity>): Entity;

  abstract merge(
    mergeIntoEntity: Entity,
    ...entityLikes: DeepPartial<Entity>[]
  ): Entity;

  /**
   * Prepare a DTO for write operations.
   * Transforms DTO to entity instance if needed. An empty object is a
   * valid entity (e.g. every column is server-populated) — rejecting it
   * is a schema/validation-layer decision, not this adapter's (see #466).
   */
  prepare(dto: DeepPartial<Entity>): Entity | undefined {
    if (!isObject(dto)) {
      return undefined;
    }

    const entityType = this.metadata.type;

    if (dto instanceof entityType) {
      return dto;
    }

    return Object.assign(new entityType(), dto);
  }

  /**
   * Get primary key column names from metadata
   */
  protected getPrimaryColumns(): (keyof Entity & string)[] {
    return this.metadata.columns
      .filter((col) => col.isPrimary)
      .map((col) => col.name);
  }

  /**
   * Get the optimistic-locking version column name from metadata, if any.
   */
  protected getVersionColumn(): (keyof Entity & string) | undefined {
    return this.metadata.columns.find((col) => col.isVersion)?.name;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Federation helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if any requested joins target federated relations.
   */
  private hasFederatedJoins(join?: JoinClause[]): boolean {
    if (!join?.length || !this.metadata.relations?.length) return false;
    const joinNames = new Set(join.map((j) => j.relation));
    return this.metadata.relations.some(
      (r) => r.federated && joinNames.has(r.name),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JoinClause resolution (ORM-agnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate JoinClauses against repository relation metadata.
   *
   * Called by ORM adapters before translating to native find options.
   */
  protected resolveJoinClauses(join?: JoinClause[]): JoinClause[] | undefined {
    if (!join?.length) return undefined;

    const relMap = new Map(this.metadata.relations?.map((r) => [r.name, r]));

    for (const j of join) {
      if (!relMap.has(j.relation)) {
        throw new RuntimeException({
          message: 'Unknown relation "%s" on entity "%s"',
          messageParams: [j.relation, this.metadata.name],
          httpStatus: HttpStatus.BAD_REQUEST,
          fault: 'client',
        });
      }
    }

    return join;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause AST helpers (ORM-agnostic)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Flatten a WhereClause tree into Disjunctive Normal Form:
   * an array of AND-branches, where each branch is a flat list
   * of WhereClause leaves. The outer array represents OR.
   *
   * Leaves are either WhereConditions or not(...) compounds
   * preserved for ORM-specific translation.
   */
  protected toDnf(clause: WhereClause): WhereClause[][] {
    if (isWhereCondition(clause)) {
      return [[clause]];
    }

    if (!isWhereCompound(clause)) return [];

    switch (clause.operator) {
      case WhereCompoundOperator.OR:
        return clause.conditions.flatMap((c) => this.toDnf(c));

      case WhereCompoundOperator.AND: {
        const groups = clause.conditions.map((c) => this.toDnf(c));
        const nonEmpty = groups.filter((g) => g.length > 0);
        if (nonEmpty.length === 0) return [];
        if (nonEmpty.length === 1) return nonEmpty[0];
        return this.cartesianProduct(nonEmpty);
      }

      default:
        return [];
    }
  }

  protected static readonly MAX_DNF_BRANCHES = 50;

  /**
   * Compute cartesian product of AND-groups of OR-branches.
   * Distributes AND over OR at the AST level.
   *
   * e.g., `[[[a]], [[b], [c]]] => [[a, b], [a, c]]`
   */
  protected cartesianProduct(groups: WhereClause[][][]): WhereClause[][] {
    let result = groups[0];

    for (let i = 1; i < groups.length; i++) {
      const nextGroup = groups[i];
      const newResult: WhereClause[][] = [];
      for (const existing of result) {
        for (const next of nextGroup) {
          if (newResult.length >= RepositoryAdapter.MAX_DNF_BRANCHES) {
            throw new RuntimeException({
              message: 'Where clause too complex: exceeded %d DNF branches',
              messageParams: [RepositoryAdapter.MAX_DNF_BRANCHES],
              httpStatus: HttpStatus.BAD_REQUEST,
              fault: 'client',
            });
          }
          newResult.push([...existing, ...next]);
        }
      }
      result = newResult;
    }

    return result;
  }

  /**
   * Run repository hooks for a specific method key.
   *
   * @param methodKey - The hook method key (e.g., 'beforeFind', 'afterCreate')
   * @param payload - The payload to pass through hooks
   * @param ctx - The hook context
   * @param filter - Optional predicate over each method's metadata (e.g.
   *   `RepoHookStrategy.merge`/`.replace`), letting a single method key be
   *   split into disjoint execution passes
   * @returns The payload after processing by applicable hooks
   */
  protected async runHooks<T>(
    methodKey: HookMethodKeyType,
    payload: T,
    ctx: PlainLiteralObject | undefined,
    filter?: HookMethodFilter,
  ): Promise<T> {
    if (!this.hookResolver) {
      return payload;
    }

    return this.hookResolver.execute(RepoHook, methodKey, payload, ctx, filter);
  }
}

import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { JoinClause } from '../repository/interfaces/join-clause.interface.js';
import { RepositoryFindOptions } from '../repository/interfaces/repository-options.interface.js';
import { RepositoryRelationMetadataInterface } from '../repository/interfaces/repository-relation-metadata.interface.js';
import { RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import { OrderClause } from '../repository/repository.types.js';
import { Where } from '../repository/where.helpers.js';
import {
  REPOSITORY_REGISTRY,
  RepositoryRegistryService,
} from '../services/repository-registry.service.js';
import { getDynamicRepositoryToken } from '../utils/get-dynamic-repository-token.js';

import { BufferStrategy } from './buffer-strategy.js';
import { FederationException } from './exceptions/federation.exception.js';
import { analyzeExecution, ExecutionAnalysis } from './execution-strategy.js';
import {
  FEDERATION_DEFAULT_LIMIT,
  FEDERATION_MAX_ITERATIONS,
} from './federation.constants.js';
import {
  FederatedRelation,
  FederationStrategy,
  RelationResult,
} from './federation.types.js';
import { FilterAnalyzer } from './filter-analyzer.js';
import { hydrateRelations } from './hydration.js';

export const FEDERATION_ORCHESTRATOR = Symbol('FederationOrchestrator');

/**
 * Stateless singleton that orchestrates federated (separate-query)
 * relation loading at the repository level.
 *
 * When a `findAndCount` call includes joins targeting relations
 * marked `federated: true` in metadata, the orchestrator:
 *
 * 1. Strips federated joins from the root query.
 * 2. Analyzes filters/sorts to choose ROOT_FIRST or RELATION_FIRST.
 * 3. Executes root + peer queries via RepositoryRegistry.
 * 4. Hydrates results and returns `[Entity[], accurateTotal]`.
 */
@Injectable()
export class FederationOrchestrator {
  constructor(
    @Inject(REPOSITORY_REGISTRY)
    private readonly registry: RepositoryRegistryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Execute a federated findAndCount.
   *
   * If no joined relations are federated, delegates directly to the
   * root repository's `findAndCount`.
   */
  async findAndCount<Entity extends PlainLiteralObject>(
    rootRepo: RepositoryInterface<Entity>,
    options?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]> {
    const meta = rootRepo.metadata;
    const primaryKeys = meta.columns
      .filter((c) => c.isPrimary)
      .map((c) => c.name);
    const rootPK = primaryKeys[0];

    if (!rootPK) {
      throw new FederationException({
        message: 'Entity "%s" has no primary key column',
        messageParams: [meta.name],
        fault: 'usage',
      });
    }

    // Identify federated relations from metadata + requested joins
    const federatedRelations = this.buildFederatedRelations(
      meta.relations ?? [],
      primaryKeys,
      options?.join,
    );

    if (federatedRelations.length === 0) {
      return rootRepo.findAndCount(options);
    }

    // Build filter analyzer (separates root vs relation conditions)
    const sortedRelationNames = this.getSortedRelationNames(
      options?.order,
      federatedRelations,
    );
    const filterAnalyzer = new FilterAnalyzer(
      options?.where,
      federatedRelations,
      sortedRelationNames,
    );

    // Analyze execution strategy
    const analysis = analyzeExecution(
      filterAnalyzer,
      options?.order,
      federatedRelations,
    );

    // Strip federated joins from root options
    const rootOptions = this.buildRootOptions(
      options,
      analysis,
      federatedRelations,
    );

    const take = options?.take ?? FEDERATION_DEFAULT_LIMIT;
    const skip = options?.skip ?? 0;

    if (analysis.strategy === FederationStrategy.ROOT_FIRST) {
      return this.executeRootFirst(
        rootRepo,
        rootOptions,
        federatedRelations,
        rootPK,
        analysis,
        options,
      );
    }

    return this.executeRelationFirst(
      rootRepo,
      rootOptions,
      federatedRelations,
      rootPK,
      analysis,
      take,
      skip,
      options,
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ROOT_FIRST strategy
  // ═══════════════════════════════════════════════════════════════════

  private async executeRootFirst<Entity extends PlainLiteralObject>(
    rootRepo: RepositoryInterface<Entity>,
    rootOptions: RepositoryFindOptions<Entity>,
    relations: FederatedRelation[],
    rootPK: string,
    analysis: ExecutionAnalysis,
    originalOptions?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]> {
    const [roots, total] = await rootRepo.findAndCount(rootOptions);

    if (roots.length === 0) {
      return [[], total];
    }

    const relationResults = await this.fetchRelationsForRoots(
      roots,
      relations,
      analysis,
      originalOptions,
    );

    hydrateRelations(roots, rootPK, relationResults);

    return [roots, total];
  }

  // ═══════════════════════════════════════════════════════════════════
  // RELATION_FIRST strategy
  // ═══════════════════════════════════════════════════════════════════

  private async executeRelationFirst<Entity extends PlainLiteralObject>(
    rootRepo: RepositoryInterface<Entity>,
    rootOptions: RepositoryFindOptions<Entity>,
    relations: FederatedRelation[],
    rootPK: string,
    analysis: ExecutionAnalysis,
    take: number,
    skip: number,
    originalOptions?: RepositoryFindOptions<Entity>,
  ): Promise<[Entity[], number]> {
    // Get root filter total for accurate pagination
    const rootFilterTotal = await this.getRootTotal(rootRepo, rootOptions);

    // Discover root IDs through iterative relation queries
    const discovery = await this.discoverRootIds(
      relations,
      analysis,
      take,
      skip,
      originalOptions,
    );

    if (discovery.rootIds.length === 0) {
      return [[], 0];
    }

    // Fetch constrained roots
    let roots = await this.fetchConstrainedRoots(
      rootRepo,
      rootOptions,
      rootPK,
      discovery.rootIds,
      take,
    );

    // Reorder to match relation-driven sort order
    roots = this.reorderByIds(roots, discovery.rootIds, rootPK);
    roots = roots.slice(0, take);

    // Fetch complete relation data for final roots
    const relationResults = await this.fetchRelationsForRoots(
      roots,
      relations,
      analysis,
      originalOptions,
    );

    hydrateRelations(roots, rootPK, relationResults);

    const accurateTotal = Math.min(rootFilterTotal, discovery.relationTotal);
    return [roots, accurateTotal];
  }

  // ═══════════════════════════════════════════════════════════════════
  // Root ID discovery (iterative constraint building)
  // ═══════════════════════════════════════════════════════════════════

  private async discoverRootIds<Entity extends PlainLiteralObject>(
    relations: FederatedRelation[],
    analysis: ExecutionAnalysis,
    take: number,
    skip: number,
    originalOptions?: RepositoryFindOptions<Entity>,
  ): Promise<{
    rootIds: unknown[];
    relationTotal: number;
  }> {
    const accumulated = new Set<unknown>();
    const buffer = new BufferStrategy(take);
    let relationTotal = 0;

    for (let i = 0; i < FEDERATION_MAX_ITERATIONS; i++) {
      const batch = await this.processRelationChain(
        relations,
        analysis,
        buffer,
        skip,
        originalOptions,
      );

      relationTotal = Math.max(relationTotal, batch.relationTotal);

      for (const id of batch.constraintIds) {
        accumulated.add(id);
      }

      if (
        accumulated.size >= take ||
        batch.constraintIds.length === 0 ||
        batch.exhausted
      ) {
        break;
      }

      if (buffer.hasReachedLimit()) break;
    }

    return { rootIds: [...accumulated], relationTotal };
  }

  /**
   * Process relations sequentially, each passing root ID constraints
   * to the next. Non-owning relations only (owning relations cannot
   * produce root ID constraints).
   */
  private async processRelationChain<Entity extends PlainLiteralObject>(
    relations: FederatedRelation[],
    analysis: ExecutionAnalysis,
    buffer: BufferStrategy,
    userSkip: number,
    originalOptions?: RepositoryFindOptions<Entity>,
  ): Promise<{
    constraintIds: unknown[];
    relationTotal: number;
    exhausted: boolean;
  }> {
    const { limit, offset } = buffer.advance();
    const nonOwnerRelations = relations.filter((r) => !r.isOwning);

    let constraintIds: unknown[] = [];
    let relationTotal = 0;
    let exhausted = false;

    for (let i = 0; i < nonOwnerRelations.length; i++) {
      const relation = nonOwnerRelations[i];
      const isDriving = relation === analysis.drivingRelation;
      const isFirst = i === 0;
      const shouldPaginate =
        isDriving || (!analysis.drivingRelation && isFirst);

      // Build peer query options
      const peerConditions = [
        ...analysis.filterAnalyzer.getRelationConditions(relation),
      ];

      // Add constraint from previous relation's root IDs
      if (constraintIds.length > 0) {
        const constraint = FilterAnalyzer.buildConstraint(
          relation.on.to,
          constraintIds,
        );
        if (constraint) peerConditions.push(constraint);
      }

      // Determine pagination for this relation. `offset` tracks the
      // buffer's own progress through successive discovery batches, so it
      // must stay relative to the caller's skip — not replace it — or a
      // later batch reads data from before the caller's requested window.
      let effectiveSkip: number | undefined;
      if (shouldPaginate) {
        effectiveSkip = userSkip + offset;
      }

      const peerOptions: RepositoryFindOptions = {
        where: FilterAnalyzer.buildWhereClause(peerConditions),
        order: isDriving
          ? analysis.relationOrders.get(relation.name)
          : undefined,
        take: shouldPaginate ? limit : undefined,
        skip: effectiveSkip,
        ctx: originalOptions?.ctx,
      };

      const peerRepo = this.getPeerRepo(relation.targetEntity);
      const [data, total] = await peerRepo.findAndCount(peerOptions);

      if (!data || data.length === 0) {
        constraintIds = [];
        break;
      }

      if (isDriving || (isFirst && relationTotal === 0)) {
        relationTotal = total;
      }

      if (shouldPaginate && data.length < limit) {
        exhausted = true;
      }

      // Extract root IDs from relation data (target FK → root PK)
      const ids = data.map((d) => d[relation.on.to]).filter((v) => v != null);
      constraintIds = [...new Set(ids)];

      if (constraintIds.length === 0) break;
    }

    return { constraintIds, relationTotal, exhausted };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Relation fetching
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Fetch relation data for a set of root entities.
   * Builds constraint filters from root field values and queries
   * each peer repository in parallel.
   */
  private async fetchRelationsForRoots<Entity extends PlainLiteralObject>(
    roots: Entity[],
    relations: FederatedRelation[],
    analysis: ExecutionAnalysis,
    originalOptions?: RepositoryFindOptions<Entity>,
  ): Promise<RelationResult[]> {
    if (roots.length === 0 || relations.length === 0) return [];

    const promises = relations.map(async (relation) => {
      try {
        const peerRepo = this.getPeerRepo(relation.targetEntity);

        // Extract constraint values from roots
        const rawValues = roots
          .map((r) => r[relation.on.from])
          .filter((v) => v != null);
        const constraintValues = [...new Set(rawValues)];

        // Build peer query conditions
        const conditions = [
          ...analysis.filterAnalyzer.getRelationConditions(relation),
        ];
        const constraint = FilterAnalyzer.buildConstraint(
          relation.on.to,
          constraintValues,
        );
        if (constraint) conditions.push(constraint);

        const peerOptions: RepositoryFindOptions = {
          where: FilterAnalyzer.buildWhereClause(conditions),
          ctx: originalOptions?.ctx,
        };

        const [data, total] = await peerRepo.findAndCount(peerOptions);
        return { relation, data, total };
      } catch (error) {
        throw new FederationException({
          message: 'Failed to fetch relation "%s" from entity "%s"',
          messageParams: [relation.name, relation.targetEntity],
          originalError: error,
          fault: 'internal',
        });
      }
    });

    return Promise.all(promises);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Root query helpers
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get the total count of roots matching root-only filters.
   * Used for accurate pagination in RELATION_FIRST strategy.
   */
  private async getRootTotal<Entity extends PlainLiteralObject>(
    rootRepo: RepositoryInterface<Entity>,
    rootOptions: RepositoryFindOptions<Entity>,
  ): Promise<number> {
    if (!rootOptions.where) return Number.MAX_SAFE_INTEGER;

    const countOptions: RepositoryFindOptions<Entity> = {
      where: rootOptions.where,
      ctx: rootOptions.ctx,
    };

    return rootRepo.count(countOptions);
  }

  /**
   * Fetch roots constrained to specific IDs.
   */
  private async fetchConstrainedRoots<Entity extends PlainLiteralObject>(
    rootRepo: RepositoryInterface<Entity>,
    rootOptions: RepositoryFindOptions<Entity>,
    rootPK: string,
    rootIds: unknown[],
    take: number,
  ): Promise<Entity[]> {
    const constraint = FilterAnalyzer.buildConstraint(rootPK, rootIds);
    if (!constraint) return [];

    const where = rootOptions.where
      ? Where.and(rootOptions.where, constraint)
      : constraint;

    const constrainedOptions: RepositoryFindOptions<Entity> = {
      ...rootOptions,
      where,
      take,
      skip: undefined,
    };

    const [roots] = await rootRepo.findAndCount(constrainedOptions);
    return roots;
  }

  /**
   * Reorder roots to match the order of provided IDs.
   */
  private reorderByIds<Entity extends PlainLiteralObject>(
    roots: Entity[],
    orderedIds: unknown[],
    rootPK: string,
  ): Entity[] {
    const map = new Map<unknown, Entity>();
    for (const root of roots) {
      map.set(root[rootPK], root);
    }

    return orderedIds
      .map((id) => map.get(id))
      .filter((r): r is Entity => r !== undefined);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Setup helpers
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build FederatedRelation array from metadata + join clauses.
   * Only includes relations that are both `federated: true` in metadata
   * AND present in the requested join list.
   */
  private buildFederatedRelations(
    relations: RepositoryRelationMetadataInterface[],
    rootPrimaryKeys: string[],
    joins?: JoinClause[],
  ): FederatedRelation[] {
    if (!joins?.length) return [];

    const joinMap = new Map(joins.map((j) => [j.relation, j]));

    return relations
      .filter((rel) => rel.federated && joinMap.has(rel.name))
      .map((rel) => ({
        ...rel,
        joinType: joinMap.get(rel.name)?.joinType ?? ('LEFT' as const),
        isOwning: !rootPrimaryKeys.includes(rel.on.from),
      }));
  }

  /**
   * Build root query options with federated joins stripped
   * and relation-tagged conditions removed.
   */
  private buildRootOptions<Entity extends PlainLiteralObject>(
    options: RepositoryFindOptions<Entity> | undefined,
    analysis: ExecutionAnalysis,
    federatedRelations: FederatedRelation[],
  ): RepositoryFindOptions<Entity> {
    const federatedNames = new Set(federatedRelations.map((r) => r.name));
    const nonFederatedJoins = options?.join?.filter(
      (j) => !federatedNames.has(j.relation),
    );

    return {
      ...options,
      where: analysis.filterAnalyzer.getRootWhere(),
      order: analysis.rootOrder,
      join:
        nonFederatedJoins && nonFederatedJoins.length > 0
          ? nonFederatedJoins
          : undefined,
    };
  }

  /**
   * Get the set of relation names present as sort keys in the order options.
   */
  private getSortedRelationNames(
    order: OrderClause | undefined,
    relations: FederatedRelation[],
  ): Set<string> {
    if (!order) return new Set();

    const relationNames = new Set(relations.map((r) => r.name));
    const sorted = new Set<string>();

    for (const key of order) {
      if (key.relation && relationNames.has(key.relation)) {
        sorted.add(key.relation);
      }
    }

    return sorted;
  }

  /**
   * Resolve a peer repository by entity name via the registry.
   */
  private getPeerRepo<T extends PlainLiteralObject>(
    entityName: string,
  ): RepositoryInterface<T> {
    const item = this.registry.getByEntityName(entityName);
    if (!item) {
      throw new FederationException({
        message: 'No repository registered for entity "%s"',
        messageParams: [entityName],
        fault: 'usage',
      });
    }

    return this.moduleRef.get(getDynamicRepositoryToken(item.key), {
      strict: false,
    });
  }
}

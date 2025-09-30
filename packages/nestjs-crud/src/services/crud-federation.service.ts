import { PlainLiteralObject } from '@nestjs/common';

import { CrudRequestInterface } from '../crud/interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../crud/interfaces/crud-response-paginated.interface';
import {
  CRUD_FEDERATION_DEFAULT_LIMIT,
  CRUD_FEDERATION_DEFAULT_PAGE,
  CRUD_RELATION_CARDINALITY_ONE,
  CRUD_RELATION_CARDINALITY_MANY,
  CRUD_FEDERATION_MAX_ITERATIONS,
  CRUD_FEDERATION_MAX_BUFFER_SIZE,
} from '../crud.constants';
import { CrudFederationException } from '../exceptions/crud-federation.exception';
import {
  QueryFilter,
  QueryRelation,
  QuerySort,
  QuerySortOperator,
  CondOperator,
} from '../request/types/crud-request-query.types';

import { CrudRelationRegistry } from './crud-relation.registry';
import { CrudSearchHelper } from './helpers/crud-search.helper';
import { CrudFederationFetchOptionsInterface } from './interfaces/crud-federation-fetch-options.interface';
import { CrudFetchServiceInterface } from './interfaces/crud-fetch-service.interface';
import { CrudRelationBindingInterface } from './interfaces/crud-relation-binding.interface';

/**
 * Utility function to find the relation binding that matches a QueryRelation
 */
function findRelationBinding<
  T extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
>(
  relation: QueryRelation<T, PlainLiteralObject> | null,
  bindings: CrudRelationBindingInterface<T, Relations[number]>[],
): CrudRelationBindingInterface<T, Relations[number]> | null {
  if (!relation) return null;
  return (
    bindings.find((b) => b.relation.property === relation.property) || null
  );
}

/**
 * Utility function to validate that many-cardinality relations require distinctFilter
 */
function validateManyCardinalityDistinctFilter<T extends PlainLiteralObject>(
  relation: QueryRelation<T, PlainLiteralObject>,
  errorContext: string,
): void {
  // One-to-one relationships are always supported
  if (relation.cardinality === CRUD_RELATION_CARDINALITY_ONE) {
    return;
  }

  // Many relationships require distinctFilter
  if (!relation.distinctFilter) {
    throw new CrudFederationException({
      message:
        `${errorContext} on many-cardinality relationship '%s' requires a distinctFilter configuration. ` +
        "Add distinctFilter: { fieldName: { [CondOperator.EQUALS]: 'value' } } to the relation configuration. " +
        'This is required because many-cardinality relationships can have multiple related entities per root, ' +
        'which would result in ambiguous sort ordering and inaccurate pagination totals. ' +
        'The distinctFilter ensures exactly one relation entity per root, making operations deterministic.',
      messageParams: [relation.property],
    });
  }
}

/**
 * Cache entry for filters organized by relation property
 */
type RelationFilterCache<T extends PlainLiteralObject> = {
  relationAndFilters: QueryFilter<T>[];
  relationOrFilters: QueryFilter<T>[];
};

/**
 * Instance-based filter analyzer with caching to avoid repeated processing
 */
class FilterAnalyzer<T extends PlainLiteralObject> {
  private readonly rootAndFilters: QueryFilter<T>[];
  private readonly rootOrFilters: QueryFilter<T>[];
  private readonly filtersByRelation: Map<string, RelationFilterCache<T>>;
  private readonly relations: QueryRelation<T, PlainLiteralObject>[];

  constructor(req: CrudRequestInterface<T>) {
    // Single-pass processing - build cache and separate root filters
    this.rootAndFilters = [];
    this.rootOrFilters = [];
    this.filtersByRelation = new Map();

    // Store relations for later use
    this.relations = req.options?.query?.relations?.relations || [];

    const andFilters = req.parsed.filter || [];
    const orFilters = req.parsed.or || [];
    this.processFilters(andFilters, orFilters);

    // Process additional filters if relations exist
    if (this.relations.length > 0) {
      this.injectInnerJoinFilters(req, this.relations);
      this.processDistinctFilters(this.relations);
    }
  }

  /**
   * Get root AND filters only
   */
  getRootAndFilters(): QueryFilter<T>[] {
    return this.rootAndFilters;
  }

  /**
   * Get root OR filters only
   */
  getRootOrFilters(): QueryFilter<T>[] {
    return this.rootOrFilters;
  }

  /**
   * Check if there are any root filters (AND or OR)
   */
  hasRootFilters(): boolean {
    return this.rootAndFilters.length > 0 || this.rootOrFilters.length > 0;
  }

  /**
   * Check if a specific relation has any filters
   */
  hasFiltersForRelation<R extends PlainLiteralObject>(
    relation: QueryRelation<T, R>,
  ): boolean {
    const cached = this.filtersByRelation.get(relation.property);
    return cached
      ? cached.relationAndFilters.length > 0 ||
          cached.relationOrFilters.length > 0
      : false;
  }

  /**
   * Get AND filters for a specific relation
   */
  private getRelationAndFilters<R extends PlainLiteralObject>(
    relation: QueryRelation<T, R>,
  ): QueryFilter<T>[] {
    const cached = this.filtersByRelation.get(relation.property);
    return cached ? cached.relationAndFilters : [];
  }

  /**
   * Get OR filters for a specific relation
   */
  private getRelationOrFilters<R extends PlainLiteralObject>(
    relation: QueryRelation<T, R>,
  ): QueryFilter<T>[] {
    const cached = this.filtersByRelation.get(relation.property);
    return cached ? cached.relationOrFilters : [];
  }

  /**
   * Apply filters for a specific relation directly to a relation request
   */
  applyRelationFilters<R extends PlainLiteralObject>(
    relationReq: CrudRequestInterface<R>,
    relation: QueryRelation<T, R>,
  ): void {
    // Apply AND filters
    const relationAndFilters = this.getRelationAndFilters(relation);
    for (const filter of relationAndFilters) {
      const relationFilter: QueryFilter<R> = { ...filter };
      relationReq.parsed.filter.push(relationFilter);
    }

    // Apply OR filters
    const relationOrFilters = this.getRelationOrFilters(relation);
    for (const filter of relationOrFilters) {
      const relationFilter: QueryFilter<R> = { ...filter };
      relationReq.parsed.or.push(relationFilter);
    }
  }

  /**
   * Add constraint filter directly to a request (for ephemeral ID constraints)
   */
  static addConstraintFilter<Entity extends PlainLiteralObject>(
    req: CrudRequestInterface<Entity>,
    field: string,
    values: unknown[],
    relation?: string,
  ): void {
    if (values.length === 0) {
      return; // No constraints to add
    }

    if (values.length === 1) {
      // single value: use CondOperator.EQUALS operator
      req.parsed.filter.push({
        field,
        operator: CondOperator.EQUALS,
        value: values[0],
        relation,
      });
    } else {
      // multiple values: use CondOperator.IN operator
      req.parsed.filter.push({
        field,
        operator: CondOperator.IN,
        value: values,
        relation,
      });
    }
  }

  /**
   * Check if any filters exist for the given relations
   */
  hasRelationFilters(
    relations: CrudRelationBindingInterface<T, PlainLiteralObject>[],
  ): boolean {
    if (this.filtersByRelation.size === 0) {
      return false;
    }

    // Check each relation directly
    for (const relationBinding of relations) {
      if (this.hasFiltersForRelation(relationBinding.relation)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Single-pass filter processing - simpler approach without duplication
   */
  private processFilters(
    andFilters: QueryFilter<T>[],
    orFilters: QueryFilter<T>[],
  ): void {
    this.processFilterArray(andFilters, true);
    this.processFilterArray(orFilters, false);
  }

  /**
   * Process a single filter array
   */
  private processFilterArray(
    filters: QueryFilter<T>[],
    isAndFilter: boolean,
  ): void {
    for (const filter of filters) {
      if (filter.relation) {
        this.addRelationFilter(filter, isAndFilter);
      } else {
        (isAndFilter ? this.rootAndFilters : this.rootOrFilters).push(filter);
      }
    }
  }

  /**
   * Helper to add a relation filter to the cache
   */
  private addRelationFilter(
    filter: QueryFilter<T>,
    isAndFilter: boolean,
  ): void {
    let cached = this.filtersByRelation.get(filter.relation!);

    if (!cached) {
      cached = {
        relationAndFilters: [],
        relationOrFilters: [],
      };
      this.filtersByRelation.set(filter.relation!, cached);
    }

    if (isAndFilter) {
      cached.relationAndFilters.push(filter);
    } else {
      cached.relationOrFilters.push(filter);
    }
  }

  /**
   * Inject CondOperator.NOT_NULL filters for relations requiring INNER JOIN semantics
   */
  private injectInnerJoinFilters(
    req: CrudRequestInterface<T>,
    relations: QueryRelation<T, PlainLiteralObject>[],
  ): void {
    const relationsSortedOn = new Set<string>();
    const allSorts = req.parsed.sort || [];

    for (const sortConfig of allSorts) {
      const drivingRelation = this.findRelationForSortField(sortConfig);
      if (drivingRelation) {
        relationsSortedOn.add(drivingRelation.property);
      }
    }

    const innerJoinRelations = relations.filter(
      (relation) =>
        relation.join === 'INNER' || relationsSortedOn.has(relation.property),
    );

    for (const relation of innerJoinRelations) {
      const foreignKeyField = relation.foreignKey;

      // Check if NOT_NULL filter already exists in root filters or relation filters
      const existingInRoot = this.rootAndFilters.find(
        (filter) =>
          filter.field === foreignKeyField &&
          filter.operator === CondOperator.NOT_NULL,
      );

      // Check if it exists in relation filters for this relation
      const relationCache = this.filtersByRelation.get(relation.property);
      const existingInRelation = relationCache?.relationAndFilters.find(
        (filter) =>
          filter.field === foreignKeyField &&
          filter.operator === CondOperator.NOT_NULL,
      );

      if (!existingInRoot && !existingInRelation) {
        // Push directly onto our internal arrays
        const innerJoinFilter: QueryFilter<T> = {
          field: foreignKeyField,
          operator: CondOperator.NOT_NULL,
          relation: relation.owner ? undefined : relation.property,
        };

        if (innerJoinFilter.relation) {
          // It's a relation filter
          this.addRelationFilter(innerJoinFilter, true);
        } else {
          // It's a root filter
          this.rootAndFilters.push(innerJoinFilter);
        }
      }
    }
  }

  findRelationForSortField(
    sortConfig: QuerySort<T>,
  ): QueryRelation<T, PlainLiteralObject> | null {
    if (sortConfig.relation) {
      return (
        this.relations.find(
          (relation) => relation.property === sortConfig.relation,
        ) || null
      );
    }
    return null;
  }

  /**
   * Process distinct filters from relations that have them defined
   */
  private processDistinctFilters(
    relations: QueryRelation<T, PlainLiteralObject>[],
  ): void {
    for (const relation of relations) {
      if (relation.distinctFilter) {
        // Add the distinct filter for this relation
        const distinctFilter: QueryFilter<T> = {
          field: relation.distinctFilter.field,
          operator: relation.distinctFilter.operator,
          value: relation.distinctFilter.value,
          relation: relation.property,
        };

        this.addRelationFilter(distinctFilter, true);
      }
    }
  }
}

/**
 * Analyzes and categorizes sort configurations for CRUD federation queries.
 * Separates sorts into root vs relation sorts and validates relation sort requirements.
 */
class SortAnalyzer<
  T extends PlainLiteralObject,
  Relations extends PlainLiteralObject[] = PlainLiteralObject[],
> {
  private readonly relationSorts: SortConfiguration<T, Relations>[];
  private readonly rootSorts: SortConfiguration<T, Relations>[];
  private readonly drivingRelation?: CrudRelationBindingInterface<
    T,
    Relations[number]
  >;

  constructor(
    req: CrudRequestInterface<T>,
    filterAnalyzer: FilterAnalyzer<T>,
    relations: CrudRelationBindingInterface<T, Relations[number]>[],
    validatedRelations: Set<string>,
  ) {
    const allSorts = req.parsed.sort || [];
    // Categorize sorts into relation vs root sorts
    const sortCategories = this.categorizeSorts(
      allSorts,
      filterAnalyzer,
      relations,
      validatedRelations,
    );
    this.relationSorts = sortCategories.relationSorts;
    this.rootSorts = sortCategories.rootSorts;

    // Identify driving relation (first relation with sort)
    this.drivingRelation = this.relationSorts[0]?.drivingRelation;
  }

  /**
   * Get sorts for relation queries
   */
  getRelationSorts(): SortConfiguration<T, Relations>[] {
    return this.relationSorts;
  }

  /**
   * Get sorts for root queries
   */
  getRootSorts(): SortConfiguration<T, Relations>[] {
    return this.rootSorts;
  }

  /**
   * Get the driving relation for RELATION_FIRST strategy
   */
  getDrivingRelation():
    | CrudRelationBindingInterface<T, Relations[number]>
    | undefined {
    return this.drivingRelation;
  }

  /**
   * Check if there are any relation sorts
   */
  hasRelationSorts(): boolean {
    return this.relationSorts.length > 0;
  }

  /**
   * Apply root sorts to a request (filters out relation sorts)
   */
  applyRootSorts(req: CrudRequestInterface<T>): void {
    req.parsed.sort = this.rootSorts.map((sort) => ({
      field: sort.field,
      order: sort.order,
    }));
  }

  /**
   * Categorize sorts into relation vs root sorts
   */
  private categorizeSorts(
    allSorts: QuerySort<T>[],
    filterAnalyzer: FilterAnalyzer<T>,
    relations: CrudRelationBindingInterface<T, Relations[number]>[],
    validatedRelations: Set<string>,
  ): {
    relationSorts: SortConfiguration<T, Relations>[];
    rootSorts: SortConfiguration<T, Relations>[];
  } {
    const relationSorts: SortConfiguration<T, Relations>[] = [];
    const rootSorts: SortConfiguration<T, Relations>[] = [];

    for (const sortConfig of allSorts) {
      const sortField = sortConfig.field;
      const sortOrder = sortConfig.order;

      // Check if sort belongs to a relation
      const foundRelation = filterAnalyzer.findRelationForSortField(sortConfig);
      const drivingRelation = findRelationBinding(foundRelation, relations);

      if (drivingRelation) {
        // Validate relation sort requirements (skip if already validated)
        this.validateRelationSortRequirements(
          sortField,
          drivingRelation,
          validatedRelations,
        );

        relationSorts.push({
          field: sortField,
          order: sortOrder,
          isRelationSort: true,
          drivingRelation,
        });
      } else {
        rootSorts.push({
          field: sortField,
          order: sortOrder,
          isRelationSort: false,
        });
      }
    }

    return { relationSorts, rootSorts };
  }

  /**
   * Validate relation sort requirements
   */
  private validateRelationSortRequirements(
    sortField: string,
    drivingRelation: CrudRelationBindingInterface<T, Relations[number]>,
    validatedRelations: Set<string>,
  ): void {
    const relation = drivingRelation.relation;
    if (!validatedRelations.has(relation.property)) {
      validateManyCardinalityDistinctFilter(
        relation,
        `Sorting by relation field '${sortField}'`,
      );
      validatedRelations.add(relation.property);
    }
  }
}

/**
 * Determines and manages the execution strategy for CRUD federation queries.
 * Analyzes filters, sorts, and relations to decide between ROOT_FIRST and RELATION_FIRST strategies.
 */
class ExecutionStrategy<
  T extends PlainLiteralObject,
  Relations extends PlainLiteralObject[] = PlainLiteralObject[],
> {
  private readonly type: JoinStrategyType;
  public readonly sortAnalyzer: SortAnalyzer<T, Relations>;
  public readonly filterAnalyzer: FilterAnalyzer<T>;
  public readonly drivingRelation?: CrudRelationBindingInterface<
    T,
    Relations[number]
  >;

  constructor(
    req: CrudRequestInterface<T>,
    relations: CrudRelationBindingInterface<T, Relations[number]>[],
  ) {
    // Create filter analyzer with complete filter processing
    this.filterAnalyzer = new FilterAnalyzer(req);

    // Track validated relations to avoid redundant validation
    const validatedRelations = new Set<string>();

    // Validate relation filter requirements
    this.validateRelationFilterRequirements(relations, validatedRelations);

    // Create sort analyzer instance
    this.sortAnalyzer = new SortAnalyzer(
      req,
      this.filterAnalyzer,
      relations,
      validatedRelations,
    );

    // Determine driving relation (considers both sorts and filters)
    this.drivingRelation = this.determineDrivingRelation(relations);

    // Determine strategy type using sort analyzer
    const hasRelationFilters =
      this.filterAnalyzer.hasRelationFilters(relations);
    this.type =
      this.sortAnalyzer.hasRelationSorts() || hasRelationFilters
        ? JoinStrategyType.RELATION_FIRST
        : JoinStrategyType.ROOT_FIRST;
  }

  /**
   * Check if this is a RELATION_FIRST strategy
   */
  isRelationFirst(): boolean {
    return this.type === JoinStrategyType.RELATION_FIRST;
  }

  /**
   * Check if this is a ROOT_FIRST strategy
   */
  isRootFirst(): boolean {
    return this.type === JoinStrategyType.ROOT_FIRST;
  }

  /**
   * Determine the driving relation based on sorts and filters
   * Priority: 1) First relation with sort, 2) First relation with filter
   */
  private determineDrivingRelation(
    relations: CrudRelationBindingInterface<T, Relations[number]>[],
  ): CrudRelationBindingInterface<T, Relations[number]> | undefined {
    // Priority 1: First relation with a sort
    const sortDrivingRelation = this.sortAnalyzer.getDrivingRelation();
    if (sortDrivingRelation) {
      return sortDrivingRelation;
    }

    // Priority 2: First relation with a filter
    for (const relationBinding of relations) {
      if (this.filterAnalyzer.hasFiltersForRelation(relationBinding.relation)) {
        return relationBinding;
      }
    }

    return undefined;
  }

  /**
   * Validate relation filter requirements
   */
  private validateRelationFilterRequirements(
    relations: CrudRelationBindingInterface<T, Relations[number]>[],
    validatedRelations: Set<string>,
  ): void {
    for (const relationBinding of relations) {
      const relation = relationBinding.relation;
      const hasFilters = this.filterAnalyzer.hasFiltersForRelation(relation);

      if (hasFilters && !validatedRelations.has(relation.property)) {
        validateManyCardinalityDistinctFilter(relation, 'Relation filters');
        validatedRelations.add(relation.property);
      }
    }
  }
}

/**
 * Manages offset-based pagination for iterative constraint discovery
 *
 * The BufferStrategy addresses the "sparse data problem" in relation-first federation:
 * When sorting by a relation field, the first page of sorted relations might only
 * correspond to a few unique root entities. For example, if sorting posts by comment.title,
 * the first 10 comments might all belong to just 2 posts, leaving the user with only
 * 2 posts instead of the requested 10.
 *
 * Uses offset-based pagination to progressively fetch more relation data until enough
 * unique root IDs are discovered to satisfy the user's requested limit.
 */
class BufferStrategy {
  private currentOffset: number = 0;
  private readonly batchSize: number;
  private readonly maxOffset: number;

  constructor(
    userLimit: number,
    options: {
      batchSize?: number;
      maxOffset?: number;
    } = {},
  ) {
    const {
      batchSize = userLimit,
      maxOffset = CRUD_FEDERATION_MAX_BUFFER_SIZE,
    } = options;

    this.batchSize = batchSize;
    // Ensure maxOffset doesn't exceed the constant limit
    this.maxOffset = Math.min(maxOffset, CRUD_FEDERATION_MAX_BUFFER_SIZE);
  }

  /**
   * Advance to next batch and return parameters (limit and offset)
   */
  advance(): { limit: number; offset: number } {
    const limit = this.batchSize;
    const offset = this.currentOffset;

    // Advance offset for next iteration
    this.currentOffset += limit;

    return { limit, offset };
  }

  /**
   * Check if we've reached the maximum offset limit
   */
  hasReachedLimit(): boolean {
    return this.currentOffset >= this.maxOffset;
  }
}

export class CrudFederationService<
  Root extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
> {
  private readonly rootSearchHelper = new CrudSearchHelper<Root>();
  private readonly relationSearchHelper = new CrudSearchHelper<
    Relations[number]
  >();

  constructor(
    private readonly rootService: CrudFetchServiceInterface<Root>,
    private readonly relationRegistry?: CrudRelationRegistry<Root, Relations>,
  ) {}

  /**
   * Get relation bindings for relation configurations.
   * Throws error if relations are configured but no registry is available.
   */
  private getRelationBindings(
    req: CrudRequestInterface<Root>,
  ): CrudRelationBindingInterface<Root, Relations[number]>[] {
    const relations = req.options?.query?.relations?.relations;

    if (!relations || relations.length === 0) {
      return [];
    }

    if (!this.relationRegistry) {
      const relationNames = relations.map((r) => r.property).join(', ');
      throw new CrudFederationException({
        message:
          'Relation registry is required when relations are configured: %s. Inject CrudRelationRegistry in the CrudService constructor.',
        messageParams: [relationNames],
      });
    }

    return this.relationRegistry.getBindings(relations);
  }

  /** Validate that search and or filters via query string are not supported */
  private validateUnsupportedQueryFeatures<T extends PlainLiteralObject>(
    req: CrudRequestInterface<T>,
    executionStrategy: ExecutionStrategy<T, Relations>,
  ): void {
    // check if search conditions exist via query string
    if (req.parsed.search) {
      throw new CrudFederationException({
        message:
          'Search via query string is not supported in CRUD federation. ' +
          'Use filter conditions instead.',
      });
    }

    // check if OR conditions exist via query string
    if (executionStrategy.filterAnalyzer.getRootOrFilters().length > 0) {
      throw new CrudFederationException({
        message:
          'OR filter via query string is not supported in CRUD federation. ' +
          'Use AND filter conditions instead.',
      });
    }
  }

  /** Create standardized error for unsupported owner relationship operations */
  private createOwnerRelationshipError(
    operation: string,
    relationProperty?: string,
  ): CrudFederationException {
    const relationContext = relationProperty
      ? ` for relationship "${relationProperty}"`
      : '';

    return new CrudFederationException({
      message:
        `${operation} on owner relationships is not supported${relationContext}. ` +
        'Owner relationships (where owner=true) store the foreign key on the root entity pointing to the relation, ' +
        'which means constraint propagation cannot extract root IDs from the relation data. ' +
        'Consider using enrichment-only access for owner relationships, or restructure the query to filter/sort on root fields instead.',
      messageParams: relationProperty ? [relationProperty] : [],
    });
  }

  /** Validate owner relationship configurations for supported scenarios */
  private validateOwnerRelationships(
    relations: CrudRelationBindingInterface<Root, Relations[number]>[],
    executionStrategy: ExecutionStrategy<Root, Relations>,
    allSorts: QuerySort<Root>[],
  ): void {
    for (const relationBinding of relations) {
      const relation = relationBinding.relation;

      if (relation.owner) {
        // Check for relation filters and sorts on owner relationships
        const hasRelationFilters =
          executionStrategy.filterAnalyzer.hasFiltersForRelation(relation);
        const hasRelationSorts = allSorts.some(
          (sort) => sort.relation === relation.property,
        );

        if (hasRelationFilters || hasRelationSorts) {
          const constraintType = hasRelationFilters
            ? hasRelationSorts
              ? 'Filtering and sorting'
              : 'Filtering'
            : 'Sorting';

          throw this.createOwnerRelationshipError(
            constraintType,
            relation.property,
          );
        }
      }
    }
  }

  /**
   * Main federation method - uses hybrid strategy based on sort and relation requirements
   *
   * Strategy Selection:
   * - ROOT_FIRST: Fetch roots first, then relations for those specific roots
   *   - Efficient for most queries (LEFT JOIN semantics)
   *   - Used when sorting by root fields or when no relation constraints exist
   *   - Maintains predictable pagination on root entities
   *
   * - RELATION_FIRST: Fetch relations first, extract root IDs, then fetch roots
   *   - Required for relation field sorting (to maintain sort order)
   *   - Required for relation filtering (INNER JOIN semantics)
   *   - Uses BufferStrategy to handle sparse data during iteration
   *   - More complex but enables relation-driven queries
   *
   * @param req - CRUD request with parsed filters, sorts, and pagination
   * @param options - Optional fetch options including metrics collection
   * @returns Paginated response with hydrated relations and optional performance metrics
   */
  async getMany(
    req: CrudRequestInterface<Root>,
    options?: CrudFederationFetchOptionsInterface,
  ): Promise<CrudResponsePaginatedInterface<Root>> {
    const { includeMetrics = false } = options || {};

    const startTime = Date.now();

    // extract relation configurations from relations
    const relations = this.getRelationBindings(req);

    // Create execution strategy (which creates filterAnalyzer internally)
    const executionStrategy = new ExecutionStrategy(req, relations);

    // validation: reject unsupported owner relationship scenarios
    const allSorts = req.parsed.sort || [];
    this.validateOwnerRelationships(relations, executionStrategy, allSorts);

    // validation: reject unsupported search and or filters via query string
    this.validateUnsupportedQueryFeatures(req, executionStrategy);

    let totalFetched = 0;
    let fetchCalls = 0;
    let resultRoots: Root[] = [];
    let allRelationResults: RelationResult<Root, Relations>[] = [];
    let accurateTotal = 0;

    // Cache root key once for this request to avoid repeated validation
    const rootKey = relations.length > 0 ? this.getRootKey(req) : '';

    // Execute strategy based on analysis
    if (executionStrategy.isRelationFirst()) {
      // RELATION_FIRST: Sequential constraint-building for relation sorts or INNER JOIN
      const sequentialResult = await this.fetchWithSequentialConstraints({
        req,
        relations,
        rootKey,
        executionStrategy,
      });
      resultRoots = sequentialResult.resultRoots;
      allRelationResults = sequentialResult.allRelationResults;
      accurateTotal = sequentialResult.accurateTotal;
      fetchCalls += sequentialResult.fetchCalls;
      totalFetched += sequentialResult.totalFetched;
    } else {
      // ROOT_FIRST: Handle all root-first scenarios
      const rootFirstResult = await this.executeRootFirstStrategy({
        req,
        relations,
        rootKey,
        executionStrategy,
      });
      resultRoots = rootFirstResult.resultRoots;
      allRelationResults = rootFirstResult.allRelationResults;
      accurateTotal = rootFirstResult.accurateTotal;
      fetchCalls += rootFirstResult.fetchCalls;
      totalFetched += rootFirstResult.totalFetched;
    }

    // Always return roots even if accurateTotal === 0
    // Empty roots means the root service returned empty, not that relations are empty

    // Hydrate relationships using pre-fetched relation data
    if (resultRoots.length > 0 && allRelationResults.length > 0) {
      const allRelationArrays = allRelationResults.map((result) => result.data);

      this.hydrateRelations(rootKey, resultRoots, relations, allRelationArrays);
    } else if (resultRoots.length > 0) {
      // Initialize empty relations for roots when no relations exist
      this.initializeRelationProperties(resultRoots, relations);
    }

    // Return result with accurate pagination metadata and optional metrics
    const metrics: FederationMetrics = {
      totalFetched,
      fetchCalls,
      duration: Date.now() - startTime,
    };

    return this.buildFinalResponse(
      resultRoots,
      accurateTotal,
      req,
      includeMetrics,
      metrics,
    );
  }

  /** Helper: Deduplicate array while preserving order of first occurrences */
  private deduplicatePreservingOrder<T>(items: T[]): T[] {
    return [...new Set(items.filter((item) => item != null))];
  }

  /** Helper: Merge relation results, deduplicating and preserving order */
  private mergeRelationResults(
    allRelationResults: RelationResult<Root, Relations>[],
    newResults: RelationResult<Root, Relations>[],
  ): void {
    for (const newResult of newResults) {
      const existingIndex = allRelationResults.findIndex(
        (existing) => existing.config === newResult.config,
      );
      if (existingIndex >= 0) {
        // Merge data, deduplicating while preserving order
        const combinedData = [
          ...allRelationResults[existingIndex].data,
          ...newResult.data,
        ];
        allRelationResults[existingIndex].data =
          this.deduplicatePreservingOrder(combinedData);
        allRelationResults[existingIndex].total = Math.max(
          allRelationResults[existingIndex].total || 0,
          newResult.total || 0,
        );
      } else {
        // First time seeing this relation config
        allRelationResults.push(newResult);
      }
    }
  }

  /** Helper: Clone request with parsed overrides */
  private cloneRequest<T extends PlainLiteralObject>(
    req: CrudRequestInterface<T>,
    parsedOverrides: Partial<CrudRequestInterface<T>['parsed']>,
  ): CrudRequestInterface<T> {
    return {
      ...req,
      parsed: {
        ...req.parsed,
        ...parsedOverrides,
      },
    };
  }

  /** Helper: Re-order roots to match the specified ID order */
  private reorderRootsByIds(
    fetchedRoots: Root[],
    orderedIds: unknown[],
    rootKey: keyof Root,
  ): Root[] {
    // create map for O(1) lookup
    const rootMap = new Map<unknown, Root>();
    for (const root of fetchedRoots) {
      rootMap.set(root[rootKey], root);
    }

    // map ordered IDs to roots and filter out undefined results
    const mappedRoots: (Root | undefined)[] = orderedIds.map((id) =>
      rootMap.get(id),
    );
    const validRoots: Root[] = mappedRoots.filter(
      (root): root is Root => root !== undefined,
    );

    // Deduplicate in case orderedIds contains duplicate IDs
    // (though this should be rare since constraint IDs are usually deduplicated)
    return this.deduplicatePreservingOrder(validRoots);
  }

  /** Single entity fetching with relation hydration */
  async getOne(req: CrudRequestInterface<Root>): Promise<Root> {
    // extract relation configurations from relations
    const relations = this.getRelationBindings(req);

    // build search conditions before calling service
    this.rootSearchHelper.buildSearch(req);

    // fetch the root entity first
    const root = await this.rootService.getOne(req);

    // if no relations requested, return root as-is
    if (relations.length === 0) {
      return root;
    }

    // fetch relations for the single root entity
    const relationArrays = await this.fetchRelationsForSingleRoot(
      root,
      relations,
    );

    // hydrate relations for the single root entity
    const rootKey = this.getRootKey(req);
    this.hydrateRelations(rootKey, [root], relations, relationArrays);

    return root;
  }

  /** Helper: Fetch relations for a single root entity */
  private async fetchRelationsForSingleRoot(
    root: Root,
    relations: CrudRelationBindingInterface<Root, Relations[number]>[],
  ): Promise<Relations[number][][]> {
    const relationPromises = relations.map(
      async (
        relationBinding: CrudRelationBindingInterface<Root, Relations[number]>,
      ): Promise<Relations[number][]> => {
        const relation = relationBinding.relation;

        // extract constraint value based on relationship direction
        const constraintValue = relation.owner
          ? root[relation.foreignKey] // Inverse: root's foreign key
          : root[relation.primaryKey]; // Forward: root's primary key

        if (constraintValue == null) {
          return [];
        }

        // Execute relation query with single constraint value
        const constraintField = relation.owner
          ? relation.primaryKey
          : relation.foreignKey;

        const result = await this.executeRelationQuery(relationBinding, {
          constraintField,
          constraintValues: [constraintValue],
        });

        return result.data;
      },
    );

    return Promise.all(relationPromises);
  }

  /**
   * Execute a standardized relation query with filters, constraints and search building
   */
  private async executeRelationQuery(
    relationBinding: CrudRelationBindingInterface<Root, Relations[number]>,
    options: {
      executionStrategy?: ExecutionStrategy<Root, Relations>;
      constraintField?: string;
      constraintValues?: unknown[];
      limit?: number;
      sorts?: SortConfiguration<Root, Relations>[];
    } = {},
  ): Promise<{ data: Relations[number][]; total?: number; count?: number }> {
    const {
      executionStrategy,
      constraintField,
      constraintValues = [],
      limit,
      sorts,
    } = options;

    // Create relation request with filters
    const relationReq = this.createRelationRequest({
      executionStrategy,
      relationBinding,
      limit,
      sorts,
    });

    // Add constraint filter if provided
    if (constraintField && constraintValues.length > 0) {
      FilterAnalyzer.addConstraintFilter(
        relationReq,
        constraintField,
        constraintValues,
        relationBinding.relation.property,
      );
    }

    // Build search conditions
    this.relationSearchHelper.buildSearch(relationReq, {
      relation: relationBinding.relation,
    });

    // Execute relation query
    return relationBinding.service.getMany(relationReq);
  }

  /**
   * Hydrate relations on root entities by setting relation results using QueryRelation.property
   *
   * @param rootKey - Root entity primary key field name for lookups
   * @param roots - Root entities to hydrate
   * @param relations - Relation configurations defining relationships
   * @param relationArrays - Pre-fetched relation data arrays (parallel to relations)
   */
  private hydrateRelations(
    rootKey: string,
    roots: Root[],
    relations: CrudRelationBindingInterface<Root, Relations[number]>[],
    relationArrays: Relations[number][][],
  ): void {
    // create a map for quick root lookups
    const rootMap = new Map<string, Root>();
    for (const root of roots) {
      rootMap.set(root[rootKey], root);
    }

    // process each relation configuration and its corresponding relation array
    for (let index = 0; index < relationArrays.length; index++) {
      const relationArray = relationArrays[index];
      const relationBinding = relations[index];
      const relation = relationBinding.relation;

      if (relation.owner) {
        this.hydrateOwnerRelations(roots, relation, relationArray);
      } else {
        this.hydrateForwardRelations(rootMap, relation, relationArray);
      }

      // initialize empty relations for roots that have no relations
      this.initializeRelationProperties(roots, [relationBinding], true);
    }
  }

  /**
   * Hydrate owner (inverse) relationships: root[foreignKey] : relation[primaryKey]
   */
  private hydrateOwnerRelations(
    roots: Root[],
    relation: QueryRelation<Root, Relations[number]>,
    relationArray: Relations[number][],
  ): void {
    if (relation.cardinality === CRUD_RELATION_CARDINALITY_MANY) {
      // For many cardinality, group relations by their primary key to handle multiple entities per key
      const relationsByKey = new Map<string, Relations[number][]>();
      for (const relationEntity of relationArray) {
        const key = relationEntity[relation.primaryKey];
        if (!relationsByKey.has(key)) {
          relationsByKey.set(key, []);
        }
        relationsByKey.get(key)!.push(relationEntity);
      }

      // assign relation arrays to roots based on root's foreign key
      for (const root of roots) {
        const foreignKeyValue = root[relation.foreignKey];
        if (foreignKeyValue != null) {
          const relationEntities = relationsByKey.get(foreignKeyValue) || [];
          this.setRelationProperty(root, relation, relationEntities);
        }
      }
    } else {
      // For one cardinality, use existing single-entity logic
      const relationsById = new Map<string, Relations[number]>();
      for (const relationEntity of relationArray) {
        relationsById.set(relationEntity[relation.primaryKey], relationEntity);
      }

      // assign relations to roots based on root's foreign key
      for (const root of roots) {
        const foreignKeyValue = root[relation.foreignKey];
        if (foreignKeyValue != null) {
          const relationEntity = relationsById.get(foreignKeyValue);
          if (relationEntity) {
            const value =
              relation.cardinality === CRUD_RELATION_CARDINALITY_ONE
                ? relationEntity
                : [relationEntity];
            this.setRelationProperty(root, relation, value);
          }
        }
      }
    }
  }

  /**
   * Hydrate forward relationships: relation[foreignKey] : root[primaryKey]
   */
  private hydrateForwardRelations(
    rootMap: Map<string, Root>,
    relation: QueryRelation<Root, Relations[number]>,
    relationArray: Relations[number][],
  ): void {
    // group relation entities by their foreign key (which points to root)
    const relationsByRootKey = new Map<string, Relations[number][]>();
    for (const relationEntity of relationArray) {
      const rootKeyValue = relationEntity[relation.foreignKey];
      const existingRelations = relationsByRootKey.get(rootKeyValue);
      if (existingRelations) {
        existingRelations.push(relationEntity);
      } else {
        relationsByRootKey.set(rootKeyValue, [relationEntity]);
      }
    }

    // set relation entities on their root entities using the relation property
    for (const [rootKeyValue, relationEntities] of relationsByRootKey) {
      const root = rootMap.get(rootKeyValue);
      if (root) {
        this.assignRelationToRoot(root, relation, relationEntities);
      }
    }
  }

  /**
   * Assign relation entities to a root (handles single entity or array)
   */
  private assignRelationToRoot(
    root: Root,
    relation: QueryRelation<Root, Relations[number]>,
    relationData: Relations[number] | Relations[number][],
  ): void {
    let value: Relations[number] | Relations[number][] | null;

    if (Array.isArray(relationData)) {
      // Multiple entities provided
      if (relation.cardinality === CRUD_RELATION_CARDINALITY_ONE) {
        value = relationData[0] || null; // Take first for one-to-one
      } else {
        value = relationData; // Use array for one-to-many
      }
    } else {
      // Single entity provided
      if (relation.cardinality === CRUD_RELATION_CARDINALITY_ONE) {
        value = relationData; // Use single entity for one-to-one
      } else {
        value = [relationData]; // Wrap in array for one-to-many
      }
    }

    this.setRelationProperty(root, relation, value);
  }

  /** Set a relation property value on a root entity */
  private setRelationProperty(
    root: Root,
    relation: QueryRelation<Root, Relations[number]>,
    value: Relations[number] | Relations[number][] | null,
  ): void {
    Object.assign(root, { [relation.property]: value });
  }

  /**
   * Initialize relation properties on roots
   *
   * @param roots - Root entities to initialize
   * @param relations - Relations to initialize (single relation or array)
   * @param onlyIfMissing - Only initialize if property doesn't exist (default: false)
   */
  private initializeRelationProperties(
    roots: Root[],
    relations: CrudRelationBindingInterface<Root, Relations[number]>[],
    onlyIfMissing: boolean = false,
  ): void {
    for (const root of roots) {
      for (const binding of relations) {
        const relation = binding.relation;

        if (!onlyIfMissing || !(relation.property in root)) {
          const defaultValue =
            relation.cardinality === CRUD_RELATION_CARDINALITY_ONE ? null : [];
          this.setRelationProperty(root, relation, defaultValue);
        }
      }
    }
  }

  /** Type guard to safely extract root key from request options */
  private getRootKey(req: CrudRequestInterface<Root>): string {
    const relations = req.options?.query?.relations;
    if (!relations) {
      throw new CrudFederationException({
        message:
          'Relations configuration is required but not found in request options',
      });
    }

    const key = relations.rootKey;
    if (!key || typeof key !== 'string') {
      throw new CrudFederationException({
        message:
          'Root key must be specified in relations.rootKey as a non-empty string',
      });
    }

    return key;
  }

  /** Helper: Create relation request with optional filters and sorts applied */
  private createRelationRequest(
    options: {
      limit?: number;
      offset?: number;
      executionStrategy?: ExecutionStrategy<Root, Relations>;
      relationBinding?: CrudRelationBindingInterface<Root, Relations[number]>;
      sorts?: SortConfiguration<Root, Relations>[];
    } = {},
  ): CrudRequestInterface<Relations[number]> {
    const { limit, offset, executionStrategy, relationBinding, sorts } =
      options;

    const relationReq: CrudRequestInterface<Relations[number]> = {
      parsed: {
        filter: [],
        or: [],
        sort: [],
        limit,
        page: undefined, // Relation services use limit/offset, never page
        fields: [],
        paramsFilter: [],
        classTransformOptions: {},
        search: undefined,
        offset,
        cache: undefined,
        includeDeleted: undefined,
      },
      options: {},
    };

    // apply relation sorts if provided
    if (sorts && sorts.length > 0) {
      relationReq.parsed.sort = sorts.map((sort) => ({
        field: sort.field,
        order: sort.order,
      }));
    }

    // apply relation filters if provided
    if (executionStrategy && relationBinding) {
      executionStrategy.filterAnalyzer.applyRelationFilters(
        relationReq,
        relationBinding.relation,
      );
    }

    return relationReq;
  }

  /** Get root count with optional filter checking */
  private async getRootTotal(
    req: CrudRequestInterface<Root>,
    executionStrategy: ExecutionStrategy<Root, Relations>,
  ): Promise<number> {
    // If no root filters exist, return max
    if (!executionStrategy.filterAnalyzer.hasRootFilters()) {
      return Number.MAX_SAFE_INTEGER;
    }

    const countReq = this.cloneRequest(req, {
      limit: 1, // We only need the count
      page: 1,
      offset: undefined,
      sort: [], // No sorting needed for count
    });

    this.rootSearchHelper.buildSearch(countReq);
    const rootResult = await this.rootService.getMany(countReq);

    return rootResult.total || rootResult.count || 0;
  }

  /** Consolidated method to fetch roots directly */
  private async fetchRootsDirectly(
    rootReq: CrudRequestInterface<Root>,
    executionStrategy?: ExecutionStrategy<Root, Relations>,
  ): Promise<{
    roots: Root[];
    total: number;
    fetchCalls: number;
    totalFetched: number;
  }> {
    // Apply root sorts if execution strategy is available
    if (executionStrategy) {
      executionStrategy.sortAnalyzer.applyRootSorts(rootReq);
    }

    // build search conditions from parsed request
    this.rootSearchHelper.buildSearch(rootReq);

    const rootResult = await this.rootService.getMany(rootReq);

    return {
      roots: rootResult.data,
      total: rootResult.total || rootResult.count,
      fetchCalls: 1,
      totalFetched: rootResult.data.length,
    };
  }

  /** Execute ROOT_FIRST strategy handling all root-first scenarios */
  private async executeRootFirstStrategy(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
  }): Promise<{
    resultRoots: Root[];
    allRelationResults: Array<{
      config: CrudRelationBindingInterface<Root, Relations[number]>;
      data: Relations[number][];
      total?: number;
    }>;
    accurateTotal: number;
    fetchCalls: number;
    totalFetched: number;
  }> {
    const { req, relations, rootKey, executionStrategy } = options;

    // Handle no relations case
    if (relations.length === 0) {
      const noRelationResult = await this.fetchRootsDirectly(
        req,
        executionStrategy,
      );
      return {
        resultRoots: noRelationResult.roots,
        allRelationResults: [],
        accurateTotal: noRelationResult.total,
        fetchCalls: noRelationResult.fetchCalls,
        totalFetched: noRelationResult.totalFetched,
      };
    }

    // LEFT JOIN: Use root-first strategy for optimal performance
    const leftJoinResult = await this.fetchRelationsForLeftJoin(
      req,
      relations,
      rootKey,
      executionStrategy,
    );

    return {
      resultRoots: leftJoinResult.roots,
      allRelationResults: leftJoinResult.relationResults,
      accurateTotal: leftJoinResult.total,
      fetchCalls: leftJoinResult.fetchCalls,
      totalFetched: leftJoinResult.totalFetched,
    };
  }

  /** Handle LEFT JOIN case - root-first strategy */
  private async fetchRelationsForLeftJoin(
    rootReq: CrudRequestInterface<Root>,
    relations: CrudRelationBindingInterface<Root, Relations[number]>[],
    rootKey: string,
    executionStrategy: ExecutionStrategy<Root, Relations>,
  ): Promise<{
    roots: Root[];
    total: number;
    fetchCalls: number;
    totalFetched: number;
    relationResults: RelationResult<Root, Relations>[];
  }> {
    // First fetch roots using consolidated method
    const rootsResult = await this.fetchRootsDirectly(
      rootReq,
      executionStrategy,
    );
    const fetchedRoots = rootsResult.roots;

    let fetchCalls = rootsResult.fetchCalls;
    let totalFetched = rootsResult.totalFetched;
    let relationResults: RelationResult<Root, Relations>[] = [];

    // Now fetch relations with root ID constraints
    if (fetchedRoots.length > 0) {
      const relationEnrichment = await this.fetchRelationsForRoots({
        req: rootReq,
        relations,
        roots: fetchedRoots,
        rootKey,
        executionStrategy,
      });

      fetchCalls += relationEnrichment.fetchCalls;
      totalFetched += relationEnrichment.totalFetched;
      relationResults = relationEnrichment.allRelationResults;
    }

    return {
      roots: fetchedRoots,
      total: rootsResult.total,
      fetchCalls,
      totalFetched,
      relationResults,
    };
  }

  /** Build final response with pagination metadata and optional metrics */
  private buildFinalResponse(
    resultRoots: Root[],
    accurateTotal: number,
    rootReq: CrudRequestInterface<Root>,
    includeMetrics: boolean,
    metrics: FederationMetrics,
  ): CrudResponsePaginatedInterface<Root> {
    const result: CrudResponsePaginatedInterface<Root> = {
      data: resultRoots,
      count: resultRoots.length,
      total: accurateTotal,
      limit: rootReq.parsed.limit || CRUD_FEDERATION_DEFAULT_LIMIT,
      page: rootReq.parsed.page || CRUD_FEDERATION_DEFAULT_PAGE,
      pageCount: rootReq.parsed.limit
        ? Math.ceil(accurateTotal / rootReq.parsed.limit)
        : Math.ceil(accurateTotal / CRUD_FEDERATION_DEFAULT_LIMIT),
      metrics: includeMetrics
        ? {
            totalFetched: metrics.totalFetched,
            totalValid: resultRoots.length,
            fetchCalls: metrics.fetchCalls,
            duration: metrics.duration,
          }
        : undefined,
    };

    return result;
  }

  /**
   * Discover root IDs through iterative constraint processing
   *
   * Uses BufferStrategy to handle sparse data by progressively increasing
   * the fetch limit until enough unique root IDs are discovered to satisfy
   * the user's requested limit.
   */
  private async discoverConstrainedRootIds(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
    processedRootIds?: Set<unknown>;
  }): Promise<{
    rootIds: unknown[];
    accurateTotal: number;
    allRelationResults: Array<{
      config: CrudRelationBindingInterface<Root, Relations[number]>;
      data: Relations[number][];
      total?: number;
    }>;
    fetchCalls: number;
    totalFetched: number;
  }> {
    const { req, relations, rootKey, executionStrategy, processedRootIds } =
      options;
    const userPage = req.parsed.page || 1;
    const userLimit = req.parsed.limit || CRUD_FEDERATION_DEFAULT_LIMIT;

    let constraintRootIds: unknown[] = [];
    const accumulatedRootIds: Set<unknown> = new Set(); // Accumulate across all iterations
    const bufferStrategy = new BufferStrategy(userLimit);
    let isDrivingRelationExhausted = false;
    let relationTotal = 0;
    let fetchCalls = 0;
    let totalFetched = 0;
    const allRelationResults: RelationResult<Root, Relations>[] = [];

    // Iterative approach to handle sparse data
    for (
      let iteration = 0;
      iteration < CRUD_FEDERATION_MAX_ITERATIONS;
      iteration++
    ) {
      constraintRootIds = [];
      const tempRelationResults: typeof allRelationResults = [];

      // Process relations sequentially - each passes constraints to the next
      const constraintResult = await this.processRelationsSequentially({
        relations,
        rootKey,
        executionStrategy,
        userPage,
        bufferStrategy,
        constraintRootIds,
      });

      // Update metrics and results
      fetchCalls += constraintResult.fetchCalls;
      totalFetched += constraintResult.totalFetched;
      constraintRootIds = constraintResult.finalConstraintIds;
      isDrivingRelationExhausted = constraintResult.isDrivingRelationExhausted;
      relationTotal = constraintResult.relationTotal;
      tempRelationResults.push(...constraintResult.relationResults);

      // Accumulate root IDs across iterations
      for (const rootId of constraintRootIds) {
        accumulatedRootIds.add(rootId);
      }

      // Filter out already processed root IDs when called from outer loop
      if (processedRootIds) {
        constraintRootIds = constraintRootIds.filter(
          (rootId) => !processedRootIds.has(rootId),
        );
        // Also filter from accumulated set
        for (const rootId of processedRootIds) {
          accumulatedRootIds.delete(rootId);
        }
      }

      // Check if we should stop iterating after processing all relations
      const haveEnoughRootIds = accumulatedRootIds.size >= userLimit;
      const noDataFound = constraintRootIds.length === 0;

      if (noDataFound || isDrivingRelationExhausted || haveEnoughRootIds) {
        // Empty intersection, hit max iterations, driving relation exhausted, or have enough IDs
        // Accumulate all relation data from this iteration for hydration
        this.mergeRelationResults(allRelationResults, tempRelationResults);
        break;
      }

      // Check if we've reached maximum offset to prevent infinite loops
      if (bufferStrategy.hasReachedLimit()) {
        break;
      }

      // Not enough IDs after processing - try next batch (offset automatically advanced)
    }

    return {
      rootIds: Array.from(accumulatedRootIds),
      accurateTotal: relationTotal, // Return relation total - accurate total calculated in fetchWithSequentialConstraints
      allRelationResults,
      fetchCalls,
      totalFetched,
    };
  }

  /**
   * Fetch root entities for specific root IDs
   */
  private async fetchConstrainedRoots(options: {
    req: CrudRequestInterface<Root>;
    rootKey: string;
    rootIds: unknown[];
    executionStrategy: ExecutionStrategy<Root, Relations>;
  }): Promise<{
    roots: Root[];
    fetchCalls: number;
    totalFetched: number;
  }> {
    const { req, rootKey, rootIds, executionStrategy } = options;

    // Extract root-only filters (preserve root filters, remove relation filters)
    const constrainedRootReq = this.cloneRequest(req, {
      filter: executionStrategy.filterAnalyzer.getRootAndFilters(), // Preserve root filters, add constraint filters
      or: executionStrategy.filterAnalyzer.getRootOrFilters(), // Preserve root or filters
      page: 1, // Always use page 1 when fetching specific IDs
      limit: req.parsed.limit || CRUD_FEDERATION_DEFAULT_LIMIT, // Preserve original limit
      offset: undefined,
    });

    // Apply root sorts (filters out relation sorts)
    executionStrategy.sortAnalyzer.applyRootSorts(constrainedRootReq);

    FilterAnalyzer.addConstraintFilter(constrainedRootReq, rootKey, rootIds);

    this.rootSearchHelper.buildSearch(constrainedRootReq);

    const rootResult = await this.rootService.getMany(constrainedRootReq);

    return {
      roots: rootResult.data,
      fetchCalls: 1,
      totalFetched: rootResult.data.length,
    };
  }

  /** Sequential constraint-building approach for both INNER JOIN and relation sorts */
  private async fetchWithSequentialConstraints(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
  }): Promise<FederationResult<Root, Relations>> {
    const { req, relations, rootKey, executionStrategy } = options;
    const userLimit = req.parsed.limit || CRUD_FEDERATION_DEFAULT_LIMIT;

    // Get root filter total if applicable
    const rootFilterTotal = await this.getRootTotal(req, executionStrategy);

    // Initialize state for iterative processing
    const state = this.initializeIterationState(req);

    // Process iterations to accumulate roots
    const iterationResult = await this.processSequentialIterations({
      req,
      relations,
      rootKey,
      executionStrategy,
      userLimit,
      state,
    });

    // Trim to requested limit and preserve sort order
    const finalRoots = iterationResult.accumulatedRoots.slice(0, userLimit);

    // Enrich final roots with complete relation data
    const finalResult = await this.enrichFinalRoots({
      req,
      relations,
      rootKey,
      finalRoots,
      executionStrategy,
      allRelationResults: iterationResult.allRelationResults,
      totalFetchCalls: iterationResult.totalFetchCalls,
      totalFetched: iterationResult.totalFetched,
    });

    // Calculate accurate total using MIN of root and relation constraints
    const accurateTotal = Math.min(
      rootFilterTotal,
      iterationResult.relationTotal,
    );

    return {
      resultRoots: finalRoots,
      allRelationResults: finalResult.allRelationResults,
      accurateTotal,
      fetchCalls: finalResult.totalFetchCalls,
      totalFetched: finalResult.totalFetched,
    };
  }

  /** Get root filter total if root filters exist */

  /** Initialize state for iterative processing */
  private initializeIterationState(req: CrudRequestInterface<Root>) {
    return {
      accumulatedRoots: [] as Root[],
      processedRootIds: new Set<unknown>(),
      allRelationResults: [] as RelationResult<Root, Relations>[],
      totalFetchCalls: 0,
      totalFetched: 0,
      relationTotal: 0,
      isExhausted: false,
      currentRelationPage: req.parsed.page || 1,
    };
  }

  /** Process sequential iterations to accumulate roots */
  private async processSequentialIterations(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
    userLimit: number;
    state: {
      accumulatedRoots: Root[];
      processedRootIds: Set<unknown>;
      allRelationResults: RelationResult<Root, Relations>[];
      totalFetchCalls: number;
      totalFetched: number;
      relationTotal: number;
      isExhausted: boolean;
      currentRelationPage: number;
    };
  }) {
    const { req, relations, rootKey, executionStrategy, userLimit, state } =
      options;

    for (
      let iteration = 0;
      iteration < CRUD_FEDERATION_MAX_ITERATIONS && !state.isExhausted;
      iteration++
    ) {
      // Process single iteration
      const iterationComplete = await this.processSingleIteration({
        req,
        relations,
        rootKey,
        executionStrategy,
        userLimit,
        state,
      });

      if (iterationComplete) {
        break;
      }

      // Advance to next relation page
      state.currentRelationPage++;
    }

    return state;
  }

  /** Process a single iteration of root discovery and fetching */
  private async processSingleIteration(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
    userLimit: number;
    state: {
      accumulatedRoots: Root[];
      processedRootIds: Set<unknown>;
      allRelationResults: RelationResult<Root, Relations>[];
      totalFetchCalls: number;
      totalFetched: number;
      relationTotal: number;
      isExhausted: boolean;
      currentRelationPage: number;
    };
  }): Promise<boolean> {
    const { req, relations, rootKey, executionStrategy, userLimit, state } =
      options;

    // Create request with updated pagination
    const iterationReq = this.cloneRequest(req, {
      page: state.currentRelationPage,
    });

    // Discover root IDs
    const discoveryResult = await this.discoverConstrainedRootIds({
      req: iterationReq,
      relations,
      rootKey,
      executionStrategy,
      processedRootIds: state.processedRootIds,
    });

    // Update metrics
    state.totalFetchCalls += discoveryResult.fetchCalls;
    state.totalFetched += discoveryResult.totalFetched;
    state.relationTotal = Math.max(
      state.relationTotal,
      discoveryResult.accurateTotal,
    );

    // Merge relation results
    this.mergeRelationResults(
      state.allRelationResults,
      discoveryResult.allRelationResults,
    );

    // Check for exhaustion
    if (discoveryResult.rootIds.length === 0) {
      if (state.currentRelationPage > (req.parsed.page || 1)) {
        state.isExhausted = true;
      }
      return true; // Iteration complete
    }

    if (discoveryResult.rootIds.length < userLimit) {
      state.isExhausted = true;
    }

    // Fetch and process roots
    const newRoots = await this.fetchAndProcessRoots({
      req,
      rootKey,
      rootIds: discoveryResult.rootIds,
      processedRootIds: state.processedRootIds,
      executionStrategy,
    });

    // Update metrics from root fetching
    state.totalFetchCalls += newRoots.fetchCalls;
    state.totalFetched += newRoots.totalFetched;
    state.accumulatedRoots.push(...newRoots.roots);

    // Check completion conditions
    return (
      state.accumulatedRoots.length >= userLimit || newRoots.roots.length === 0
    );
  }

  /** Fetch and process roots, filtering out already processed ones */
  private async fetchAndProcessRoots(options: {
    req: CrudRequestInterface<Root>;
    rootKey: string;
    rootIds: unknown[];
    processedRootIds: Set<unknown>;
    executionStrategy: ExecutionStrategy<Root, Relations>;
  }): Promise<{ roots: Root[]; fetchCalls: number; totalFetched: number }> {
    const { req, rootKey, rootIds, processedRootIds, executionStrategy } =
      options;

    // Fetch roots for discovered IDs
    const constrainedRoots = await this.fetchConstrainedRoots({
      req,
      rootKey,
      rootIds,
      executionStrategy,
    });

    // Reorder to preserve relation-driven sort order
    const reorderedRoots = this.reorderRootsByIds(
      constrainedRoots.roots,
      rootIds,
      rootKey,
    );

    // Filter out already processed roots
    const newRoots = reorderedRoots.filter((root) => {
      const rootId = root[rootKey];
      if (processedRootIds.has(rootId)) {
        return false;
      }
      processedRootIds.add(rootId);
      return true;
    });

    return {
      roots: newRoots,
      fetchCalls: constrainedRoots.fetchCalls,
      totalFetched: constrainedRoots.totalFetched,
    };
  }

  /** Enrich final roots with complete relation data */
  private async enrichFinalRoots(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    finalRoots: Root[];
    executionStrategy: ExecutionStrategy<Root, Relations>;
    allRelationResults: RelationResult<Root, Relations>[];
    totalFetchCalls: number;
    totalFetched: number;
  }) {
    const { req, relations, rootKey, finalRoots, executionStrategy } = options;
    let { allRelationResults, totalFetchCalls, totalFetched } = options;

    if (finalRoots.length > 0) {
      const enrichmentResult = await this.fetchRelationsForRoots({
        req,
        relations,
        roots: finalRoots,
        rootKey,
        executionStrategy,
      });

      // Replace constraint-filtered results with complete enrichment data
      allRelationResults = enrichmentResult.allRelationResults;
      totalFetchCalls += enrichmentResult.fetchCalls;
      totalFetched += enrichmentResult.totalFetched;
    }

    return { allRelationResults, totalFetchCalls, totalFetched };
  }

  /** Fetch relations for given root entities */
  private async fetchRelationsForRoots(options: {
    req: CrudRequestInterface<Root>;
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    roots: Root[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
    existingRelationResults?: RelationResult<Root, Relations>[];
  }): Promise<{
    allRelationResults: RelationResult<Root, Relations>[];
    fetchCalls: number;
    totalFetched: number;
  }> {
    const { relations, roots, rootKey, executionStrategy } = options;

    // extract root IDs from the provided roots
    const rootIds = roots.map((root) => root[rootKey]);

    if (relations.length === 0 || rootIds.length === 0) {
      return {
        allRelationResults: [],
        fetchCalls: 0,
        totalFetched: 0,
      };
    }

    const relationPromises = relations.map(
      async (
        relationBinding: CrudRelationBindingInterface<Root, Relations[number]>,
      ) => {
        // Always make fresh service calls with proper constraints for enrichment
        // Removed reuse logic to ensure correct constraint application

        // Extract constraint configuration and values based on relationship direction
        const constraintConfig = this.getConstraintConfig(
          relationBinding,
          rootKey,
        );
        const constraintValues = this.getConstraintValuesFromRoots(
          roots,
          constraintConfig,
        );

        // Execute standardized relation query
        const result = await this.executeRelationQuery(relationBinding, {
          executionStrategy,
          constraintField: constraintConfig.field,
          constraintValues,
        });

        return result.data;
      },
    );

    const relationArrays = await Promise.all(relationPromises);
    const totalFetched = relationArrays.reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    // Convert to the expected result structure
    const allRelationResults = relations.map((config, index) => ({
      config,
      data: relationArrays[index],
      total: relationArrays[index].length,
    }));

    return {
      allRelationResults,
      fetchCalls: relationPromises.length,
      totalFetched,
    };
  }

  /** Process relations sequentially, passing constraints from one to the next */
  private async processRelationsSequentially(options: {
    relations: CrudRelationBindingInterface<Root, Relations[number]>[];
    rootKey: string;
    executionStrategy: ExecutionStrategy<Root, Relations>;
    userPage: number;
    bufferStrategy: BufferStrategy;
    constraintRootIds: unknown[];
  }): Promise<{
    finalConstraintIds: unknown[];
    relationResults: RelationResult<Root, Relations>[];
    fetchCalls: number;
    totalFetched: number;
    isDrivingRelationExhausted: boolean;
    relationTotal: number;
  }> {
    const { relations, rootKey, executionStrategy, userPage, bufferStrategy } =
      options;

    // Get next batch parameters for offset-based pagination
    const { limit: drivingRelationRequestedLimit, offset: relationOffset } =
      bufferStrategy.advance();

    let constraintRootIds = options.constraintRootIds;
    let fetchCalls = 0;
    let totalFetched = 0;
    let isDrivingRelationExhausted = false;
    let relationTotal = 0;
    const relationResults: RelationResult<Root, Relations>[] = [];

    // Filter out owner relations from sequential processing - they cannot provide root ID constraints
    // and will be handled in the enrichment phase after roots are fetched
    const nonOwnerRelations = relations.filter(
      (relationBinding) => !relationBinding.relation.owner,
    );

    for (let i = 0; i < nonOwnerRelations.length; i++) {
      const relationBinding = nonOwnerRelations[i];
      const isDriving = relationBinding === executionStrategy.drivingRelation;
      const isFirstRelation = i === 0;

      // Apply pagination to:
      // 1. Driving relations (have relation sorts)
      // 2. First relation when no driving relation exists (relation filters only)
      const shouldApplyPagination =
        isDriving || (!executionStrategy.drivingRelation && isFirstRelation);

      // Calculate correct offset for user pagination (page -> offset conversion)
      // Only apply user pagination offset on the first iteration (relationOffset = 0)
      // For subsequent iterations, use relationOffset from BufferStrategy
      const userOffset =
        isDriving &&
        isFirstRelation &&
        userPage &&
        drivingRelationRequestedLimit &&
        relationOffset === 0 // Only on first iteration
          ? (userPage - 1) * drivingRelationRequestedLimit
          : relationOffset;

      // Create relation request
      const relationReq = this.createRelationRequest({
        executionStrategy,
        relationBinding,
        limit: shouldApplyPagination
          ? drivingRelationRequestedLimit
          : undefined,
        offset: shouldApplyPagination ? userOffset : undefined,
        sorts: isDriving
          ? executionStrategy.sortAnalyzer.getRelationSorts()
          : undefined,
      });

      // Apply constraints from previous relation
      if (constraintRootIds.length > 0) {
        FilterAnalyzer.addConstraintFilter(
          relationReq,
          rootKey,
          constraintRootIds,
        );
      }

      // Build search conditions
      this.relationSearchHelper.buildSearch(relationReq, {
        relation: relationBinding.relation,
      });

      // Execute relation query
      const relationResult = await relationBinding.service.getMany(relationReq);
      fetchCalls += 1;

      // Handle undefined or missing data
      if (!relationResult || !relationResult.data) {
        relationResults.push({
          config: relationBinding,
          data: [],
          total: 0,
        });
        constraintRootIds = [];
        break;
      }

      totalFetched += relationResult.data.length;

      // Track total from driving relation or first relation for INNER JOIN
      if (isDriving || (i === 0 && relationTotal === 0)) {
        relationTotal = relationResult.total || 0;
      }

      // Check if driving relation or first relation (when no driving relation) is exhausted
      const hasPaginationApplied =
        isDriving || (!executionStrategy.drivingRelation && isFirstRelation);
      if (
        hasPaginationApplied &&
        relationResult.data.length < drivingRelationRequestedLimit
      ) {
        isDrivingRelationExhausted = true;
      }

      // Extract root IDs from this relation to pass to next relation
      // Skip constraint extraction for owner relationships as they cannot provide root IDs
      if (!relationBinding.relation.owner) {
        const rootIds = this.getRootIdsFromRelationData(relationResult.data, {
          field: relationBinding.relation.foreignKey,
          rootField: '', // Not used for extraction
          isOwner: false, // Forward relationships only
        });
        // Pass these root IDs to the next relation (progressive constraint)
        constraintRootIds = rootIds;
      }
      // For owner relationships, keep existing constraintRootIds unchanged

      // Store relation result
      relationResults.push({
        config: relationBinding,
        data: relationResult.data,
        total: relationResult.total,
      });

      // Early exit if no root IDs found
      if (constraintRootIds.length === 0) {
        break;
      }
    }

    return {
      finalConstraintIds: constraintRootIds,
      relationResults,
      fetchCalls,
      totalFetched,
      isDrivingRelationExhausted,
      relationTotal,
    };
  }

  /**
   * Get constraint configuration for a relation binding
   */
  private getConstraintConfig(
    relationBinding: CrudRelationBindingInterface<Root, Relations[number]>,
    rootKey: string,
  ): ConstraintConfig {
    const relation = relationBinding.relation;

    if (relation.owner) {
      return {
        field: relation.primaryKey,
        rootField: relation.foreignKey,
        isOwner: true,
      };
    } else {
      return {
        field: relation.foreignKey,
        rootField: rootKey,
        isOwner: false,
      };
    }
  }

  /**
   * Extract constraint values from roots for a specific relation
   */
  private getConstraintValuesFromRoots(
    roots: Root[],
    constraintConfig: ConstraintConfig,
  ): unknown[] {
    if (constraintConfig.isOwner) {
      // Owner relationship: extract foreign keys from roots and deduplicate
      const foreignKeys = roots
        .map((root) => root[constraintConfig.rootField])
        .filter((fk) => fk != null);
      return [...new Set(foreignKeys)];
    } else {
      // Forward relationship: extract root IDs (primary keys)
      return roots.map((root) => root[constraintConfig.rootField]);
    }
  }

  /**
   * Extract root IDs from relation data using constraint configuration
   */
  private getRootIdsFromRelationData(
    relationData: Relations[number][],
    constraintConfig: ConstraintConfig,
  ): unknown[] {
    if (constraintConfig.isOwner) {
      throw new CrudFederationException({
        message:
          'ASSERTION ERROR: getRootIdsFromRelationData called with owner relationship. ' +
          'Caller should filter out owner relationships before calling this method.',
      });
    }

    // Forward relationship: Extract foreign keys as root IDs
    const allRootIds = relationData.map(
      (relationEntity) => relationEntity[constraintConfig.field],
    );
    return [...new Set(allRootIds.filter((item) => item != null))];
  }
}

// Internal types

/** Join strategy types for different getMany approaches */
enum JoinStrategyType {
  ROOT_FIRST = 'ROOT_FIRST',
  RELATION_FIRST = 'RELATION_FIRST',
}

/** Constraint configuration for root/relation data extraction */
interface ConstraintConfig {
  field: string; // Field to use for constraints in relation
  rootField: string; // Field to use for constraints in root
  isOwner: boolean; // Whether this is an owner relationship
}

/** Relation data with its configuration */
type RelationResult<
  Root extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
> = {
  config: CrudRelationBindingInterface<Root, Relations[number]>;
  data: Relations[number][];
  total?: number;
};

/** Sort configuration with its target (relation vs root) */
interface SortConfiguration<
  Root extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
> {
  field: string;
  order: QuerySortOperator;
  isRelationSort: boolean;
  drivingRelation?: CrudRelationBindingInterface<Root, Relations[number]>;
}

/** Performance metrics for federation operations */
interface FederationMetrics {
  totalFetched: number;
  fetchCalls: number;
  duration: number;
}

/** Standard federation result structure */
interface FederationResult<
  Root extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
> {
  resultRoots: Root[];
  allRelationResults: RelationResult<Root, Relations>[];
  accurateTotal: number;
  fetchCalls: number;
  totalFetched: number;
}

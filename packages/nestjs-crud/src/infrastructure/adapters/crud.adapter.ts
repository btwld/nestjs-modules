import {
  BadRequestException,
  NotFoundException,
  type PlainLiteralObject,
  type Type,
} from '@nestjs/common';

import { type DeepPartial, isObject, isUndefined } from '@concepta/nestjs-core';
import {
  type EntityColumn,
  isWhereCondition,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryInterface,
  Where,
  type WhereClause,
  type WhereCondition,
} from '@concepta/nestjs-repository';

import { type CrudContextOptionsInterface } from '../interceptors/interfaces/crud-context-options.interface.js';
import { type CrudContextInterface } from '../interceptors/interfaces/crud-context.interface.js';
import { type CrudCreateBatchInterface } from '../interfaces/crud-create-batch.interface.js';
import { type CrudParamsOptionsInterface } from '../interfaces/crud-params-options.interface.js';
import { type CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface.js';
import { SConditionConverter } from '../request/crud-scondition.converter.js';
import { type CrudParsedQueryInterface } from '../request/interfaces/crud-parsed-query.interface.js';
import { type CrudQueryOptionsInterface } from '../request/interfaces/crud-query-options.interface.js';
import { queryFilterIsArray } from '../utils/crud-infra.utils.js';
import { sanitizeForMessage } from '../utils/validation.js';

export class CrudAdapter<Entity extends PlainLiteralObject> {
  protected entityColumns: EntityColumn<Entity>[] = [];

  protected entityPrimaryColumns: EntityColumn<Entity>[] = [];

  protected entityHasDeleteColumn = false;

  constructor(protected repository: RepositoryInterface<Entity>) {
    this.initColumnMetadata();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Metadata
  // ═══════════════════════════════════════════════════════════════════════════

  entityName(): string {
    return this.repository.metadata.name;
  }

  entityType(): Type<Entity> {
    return this.repository.metadata.type;
  }

  protected initColumnMetadata(): void {
    const { columns } = this.repository.metadata;

    this.entityColumns = columns.map((col) => col.name);
    this.entityPrimaryColumns = columns
      .filter((col) => col.isPrimary)
      .map((col) => col.name);
    this.entityHasDeleteColumn = columns.some((col) => col.isRemoveDate);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pagination helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wrap page into page-info
   * override this method to create custom page-info response
   * or set custom `serialize.list` dto in the controller's CrudOption
   *
   * @param data - array of data to be paginated
   * @param total - total number of items in the collection
   * @param limit - number of items per page
   * @param offset - number of items to skip
   */
  createPageInfo(
    data: Entity[],
    total: number | undefined,
    limit: number | undefined,
    offset: number | undefined,
  ): CrudResponsePaginatedInterface<Entity> {
    return {
      data,
      limit: limit ?? 1,
      count: data.length,
      total: total ?? 0,
      page: limit ? Math.floor((offset ?? 0) / limit) + 1 : 1,
      pageCount: limit && total ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Get number of resources to be fetched
   *
   * @param query - parsed query parameters
   * @param options - query options
   */
  getTake(
    query: CrudParsedQueryInterface<Entity>,
    options: CrudQueryOptionsInterface<Entity>,
  ): number | null {
    if (query.limit) {
      return options.maxLimit
        ? Math.min(query.limit, options.maxLimit)
        : query.limit;
    }

    if (options.limit) {
      return options.maxLimit
        ? Math.min(options.limit, options.maxLimit)
        : options.limit;
    }

    return options.maxLimit ?? null;
  }

  /**
   * Get number of resources to be skipped
   *
   * @param query - parsed query parameters
   * @param take - number of resources to be fetched
   */
  getSkip(
    query: CrudParsedQueryInterface<Entity>,
    take: number | null,
  ): number | null {
    return query.page && take
      ? take * (query.page - 1)
      : query.offset
        ? query.offset
        : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Column & param helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get primary param name from CrudOptions
   *
   * @param options - crud request options
   */
  getPrimaryParams(
    options: CrudContextOptionsInterface<Entity>,
  ): EntityColumn<Entity>[] {
    const rawParams: CrudParamsOptionsInterface<Entity> = options.params ?? {};

    const params = Object.keys(rawParams).filter(
      (n) => rawParams[n] && rawParams[n].primary,
    );

    return params
      .map((p) => rawParams[p].field)
      .filter(
        (field): field is EntityColumn<Entity> => typeof field === 'string',
      );
  }

  getAllowedColumns(
    columns: EntityColumn<Entity>[],
    options: CrudQueryOptionsInterface<Entity>,
  ): EntityColumn<Entity>[] {
    const { exclude, allow } = options;

    if (!exclude?.length && !allow?.length) {
      return columns;
    }

    return columns.filter(
      (column) =>
        (!exclude?.length || !exclude.some((col) => col === column)) &&
        (!allow?.length || allow.some((col) => col === column)),
    );
  }

  /**
   * Type guard to check if a string is a valid entity column name.
   */
  protected isEntityColumn(key: string): key is keyof Entity & string {
    return this.entityColumns.some((col) => col === key);
  }

  checkFilterIsArray(cond: WhereCondition<Entity>): boolean {
    if (queryFilterIsArray(cond)) {
      return true;
    }

    throw new BadRequestException(
      `Invalid column '${sanitizeForMessage(cond.field)}' value`,
    );
  }

  /**
   * Get select fields without alias prefix.
   */
  protected getSelectFields(
    query: CrudParsedQueryInterface<Entity>,
    options: CrudQueryOptionsInterface<Entity>,
  ): (keyof Entity)[] {
    const allowed = this.getAllowedColumns(this.entityColumns, options);

    const columns =
      query.fields && query.fields.length
        ? query.fields.filter((field) => allowed.some((col) => field === col))
        : allowed;

    const selectArray = [
      ...(options.persist && options.persist.length ? options.persist : []),
      ...columns,
      ...this.entityPrimaryColumns,
    ];

    const uniqueFields = new Set<keyof Entity>(selectArray);
    return Array.from(uniqueFields);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Entity preparation
  // ═══════════════════════════════════════════════════════════════════════════

  prepareEntityBeforeSave(
    dto: DeepPartial<Entity>,
    context: CrudContextInterface<Entity>,
  ): Entity | undefined {
    if (!isObject(dto)) {
      return undefined;
    }

    // Route params always win over the body (e.g. a nested route's FK) —
    // matches update()/replace()'s merge below.
    const merged = { ...dto, ...context.params };

    return this.repository.prepare(merged);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create one entity.
   *
   * @param context - The CRUD context interface.
   * @param dto - The request body containing the entity data to create.
   */
  async create(
    context: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const entity = this.prepareEntityBeforeSave(dto, context);

    if (!entity) {
      throw new BadRequestException(
        'Invalid request body. Expected an object.',
      );
    }

    return this.repository.create(entity, { ctx: context });
  }

  /**
   * Create many entities in batch.
   *
   * @param context - The CRUD context interface.
   * @param dto - The request body containing the bulk array of entities to create.
   * @returns A promise resolving to an array of created entities.
   */
  async createBatch(
    context: CrudContextInterface<Entity>,
    dto: CrudCreateBatchInterface<DeepPartial<Entity>>,
  ): Promise<Entity[]> {
    if (!isObject(dto) || !Array.isArray(dto.bulk) || !dto.bulk.length) {
      throw new BadRequestException('Empty data. Nothing to save.');
    }

    const preparedBulk = dto.bulk.map((one) =>
      this.prepareEntityBeforeSave(one, context),
    );

    const bulk: Entity[] = preparedBulk.filter(
      (d): d is Entity => !isUndefined(d),
    );

    if (!bulk.length) {
      throw new BadRequestException('Empty data. Nothing to save.');
    }

    return this.repository.createMany(bulk, { ctx: context });
  }

  /**
   * Update one entity.
   *
   * @param context - The CRUD context interface.
   * @param dto - The request body containing the updated entity data.
   * @returns A promise resolving to the updated entity.
   */
  async update(
    context: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const found = await this.getOneOrFail(context);
    const data = { ...dto, ...context.params };

    return this.repository.update(found, data, { ctx: context });
  }

  /**
   * Replace one entity.
   *
   * @param context - The CRUD context interface.
   * @param dto - The request body containing the replacement entity data.
   * @returns A promise resolving to the replaced entity.
   */
  async replace(
    context: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const found = await this.getOneOrFail(context);
    const data = { ...dto, ...context.params };

    return this.repository.replace(found, data, { ctx: context });
  }

  /**
   * Permanently delete one entity (hard delete).
   *
   * @param context - The CRUD context interface.
   * @returns A promise resolving to the deleted entity, or null if returnDeleted is false.
   */
  async delete(context: CrudContextInterface<Entity>): Promise<Entity | null> {
    const { returnDeleted = false } = context.options?.route ?? {};
    const found = await this.getOneOrFail(context);
    const deleted = await this.repository.delete(found, { ctx: context });

    return returnDeleted ? deleted : null;
  }

  /**
   * Soft delete one entity by setting its delete date.
   *
   * @param context - The CRUD context interface.
   * @returns A promise resolving to the soft-deleted entity, or null if returnDeleted is false.
   */
  async softDelete(
    context: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const { returnDeleted = false } = context.options?.route ?? {};
    const found = await this.getOneOrFail(context);
    const deleted = await this.repository.softDelete(found, { ctx: context });

    return returnDeleted ? deleted : null;
  }

  /**
   * Restore one soft-deleted entity.
   *
   * @param context - The CRUD context interface.
   * @returns A promise resolving to the restored entity, or null if returnRestored is false.
   */
  async restore(context: CrudContextInterface<Entity>): Promise<Entity | null> {
    const { returnRestored = false } = context.options?.route ?? {};
    const found = await this.getOneOrFail(context, true);
    const restored = await this.repository.restore(found, { ctx: context });

    return returnRestored ? restored : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Query operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List many entities.
   *
   * @param context - The CRUD context interface.
   */
  async list(
    context: CrudContextInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const options = this.buildFindOptions(context);
    const [data, total] = await this.repository.findAndCount(options);
    const limit = options.take ?? total;
    const offset = options.skip ?? 0;

    return this.createPageInfo(data, total, limit, offset);
  }

  /**
   * Read one entity.
   *
   * @param context - The CRUD context interface.
   */
  async read(context: CrudContextInterface<Entity>): Promise<Entity> {
    return this.getOneOrFail(context);
  }

  protected async getOneOrFail(
    context: CrudContextInterface<Entity>,
    withDeleted = false,
  ): Promise<Entity> {
    const { query } = context;

    // Build and validate where clause from all filter sources
    const where = this.buildWhere(context);
    this.validateWhereFields(where);

    // Handle soft-delete query inclusion
    // includeDeleted=1 query param enables fetching soft-deleted entities
    const includeDeleted =
      withDeleted || (this.entityHasDeleteColumn && query.includeDeleted === 1);

    const findOptions: RepositoryFindOneOptions<Entity> = {
      ctx: context,
      where,
      join: context.options?.query?.join,
      withDeleted: includeDeleted || undefined,
    };

    const found = await this.repository.findOne(findOptions);

    if (!found) {
      throw new NotFoundException(`${this.entityName()} not found`);
    }

    return found;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FindOptions-based query methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build FindManyOptions from CRUD context.
   *
   * @param context - The CRUD context interface.
   * @returns RepositoryFindOptions for repository.findAndCount()
   */
  protected buildFindOptions(
    context: CrudContextInterface<Entity>,
  ): RepositoryFindOptions<Entity> {
    const { query, options } = context;
    const queryOptions = options.query ?? {};

    // Build and validate where clause from all filter sources
    const where = this.buildWhere(context);
    this.validateWhereFields(where);

    // Get select fields (without alias prefix)
    const select = this.getSelectFields(query, queryOptions);

    // Build order clause
    const order =
      query.sort.length > 0 ? query.sort : (queryOptions.sort ?? []);

    // Calculate pagination
    const take = this.getTake(query, queryOptions);
    const skip = this.getSkip(query, take);

    // Handle soft-delete inclusion
    // includeDeleted=1 query param enables fetching soft-deleted entities
    const withDeleted =
      this.entityHasDeleteColumn && query.includeDeleted === 1;

    return {
      ctx: context,
      where,
      join: context.options?.query?.join,
      select: select.length > 0 ? select : undefined,
      order: order.length > 0 ? order : undefined,
      take: take || undefined,
      skip: skip || undefined,
      withDeleted: withDeleted || undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Where clause building & validation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build WhereClause from all filter sources in the context.
   *
   * Combines: route params, options.query.filter, query.search, query.filter/or
   * into a single WhereClause for the repository layer.
   */
  protected buildWhere(
    context: CrudContextInterface<Entity>,
  ): WhereClause | undefined {
    const { query, options, params } = context;
    const clauses: WhereClause[] = [];

    // 1. Route params -> Where.eq(field, value) each
    for (const [field, value] of Object.entries(params)) {
      clauses.push(Where.eq(field, value));
    }

    // 2. options.query.filter -> WhereCondition[] or SCondition
    const optionsFilter = options?.query?.filter;
    if (optionsFilter) {
      if (Array.isArray(optionsFilter)) {
        clauses.push(...optionsFilter);
      } else {
        const clause = SConditionConverter.convert(optionsFilter);
        if (clause) clauses.push(clause);
      }
    }

    // 3. query.search (mutually exclusive with filter/or per parser)
    if (query.search) {
      const clause = SConditionConverter.convert(query.search);
      if (clause) clauses.push(clause);
    } else {
      // 4. query.filter[] + query.or[] -> combined WhereClause
      const filters = query.filter || [];
      const ors = query.or || [];

      if (filters.length && ors.length) {
        if (filters.length === 1 && ors.length === 1) {
          clauses.push(Where.or(filters[0], ors[0]));
        } else {
          clauses.push(Where.or(Where.and(...filters), Where.and(...ors)));
        }
      } else if (filters.length) {
        clauses.push(...filters);
      } else if (ors.length) {
        if (ors.length === 1) {
          clauses.push(ors[0]);
        } else {
          clauses.push(Where.or(...ors));
        }
      }
    }

    if (clauses.length === 0) return undefined;
    if (clauses.length === 1) return clauses[0];
    return Where.and(...clauses);
  }

  /**
   * Validate all field names in a WhereClause tree against entity columns.
   * Throws BadRequestException for any invalid field.
   */
  protected validateWhereFields(clause: WhereClause | undefined): void {
    if (!clause) return;

    if (isWhereCondition(clause)) {
      // Skip relation-tagged conditions — they target joined entities
      if (clause.relation) return;

      if (!this.isEntityColumn(clause.field)) {
        throw new BadRequestException(
          `Invalid filter field '${sanitizeForMessage(clause.field)}' for entity '${this.entityName()}'`,
        );
      }
    } else {
      for (const child of clause.conditions) {
        this.validateWhereFields(child);
      }
    }
  }
}

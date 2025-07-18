import {
  ClassType,
  hasLength,
  isArrayFull,
  isObject,
  isUndefined,
  objKeys,
  isNil,
  isNull,
} from '@nestjsx/util';
import { oO } from '@zmotivat0r/o0';
import { plainToClass } from 'class-transformer';
import {
  Brackets,
  DeepPartial,
  Repository,
  SelectQueryBuilder,
  DataSourceOptions,
  EntityMetadata,
  OrderByCondition,
} from 'typeorm';

import { NotFoundException, PlainLiteralObject } from '@nestjs/common';

import { LiteralObject } from '@concepta/nestjs-common';

import { comparisonOperatorKeys } from '../../request/crud-request.utils';
import { CrudRequestParsedParamsInterface } from '../../request/interfaces/crud-request-parsed-params.interface';
import {
  ComparisonOperator,
  QueryFilter,
  QuerySort,
  SCondition,
  SConditionKey,
} from '../../request/types/crud-request-query.types';
import { CrudCreateManyInterface } from '../interfaces/crud-create-many.interface';
import { CrudQueryOptionsInterface } from '../interfaces/crud-query-options.interface';
import { CrudRequestOptionsInterface } from '../interfaces/crud-request-options.interface';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface';

import { CrudAdapter } from './crud.adapter';

export class TypeOrmCrudAdapter<
  T extends PlainLiteralObject,
> extends CrudAdapter<T> {
  protected dbName: DataSourceOptions['type'];

  protected entityColumns: string[] = [];

  protected entityPrimaryColumns: string[] = [];

  protected entityHasDeleteColumn = false;

  protected entityColumnsHash: LiteralObject = {};

  protected sqlInjectionRegEx: RegExp[] = [
    /(%27)|(\')|(--)|(%23)|(#)/gi,
    /((%3D)|(=))[^\n]*((%27)|(\')|(--)|(%3B)|(;))/gi,
    /w*((%27)|(\'))((%6F)|o|(%4F))((%72)|r|(%52))/gi,
    /((%27)|(\'))union/gi,
  ];

  constructor(protected repo: Repository<T>) {
    super();

    this.dbName = this.repo.metadata.connection.options.type;
    this.onInitMapEntityColumns();
  }

  public entityName(): string {
    return this.repo.metadata.name;
  }

  protected get entityType(): ClassType<T> {
    return this.repo.target as ClassType<T>;
  }

  protected get alias(): string {
    return this.repo.metadata.targetName;
  }

  /**
   * Get many
   *
   * @param req - The CRUD request interface.
   */
  public async getMany(
    req: CrudRequestInterface,
  ): Promise<CrudResponsePaginatedInterface<T> | T[]> {
    const { parsed, options } = req;
    const builder = await this.createBuilder(parsed, options);
    return this.doGetMany(builder, parsed, options);
  }

  /**
   * Get one
   *
   * @param req - The CRUD request interface.
   */
  public async getOne(req: CrudRequestInterface): Promise<T> {
    return this.getOneOrFail(req);
  }

  /**
   * Create one
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the entity data to create.
   */
  public async createOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T> {
    const { returnShallow } = req.options.routes?.createOne ?? {};
    const entity = this.prepareEntityBeforeSave(dto, req.parsed);

    /* istanbul ignore if */
    if (!entity) {
      this.throwBadRequestException('Empty data. Nothing to save.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = await this.repo.save<any>(entity);

    if (returnShallow) {
      return saved;
    } else {
      const primaryParams = this.getPrimaryParams(req.options);

      /* istanbul ignore next */
      if (!primaryParams.length && primaryParams.some((p) => isNil(saved[p]))) {
        return saved;
      } else {
        req.parsed.search = primaryParams.reduce(
          (acc, p) => ({ ...acc, [p]: saved[p] }),
          {},
        );
        return this.getOneOrFail(req);
      }
    }
  }

  /**
   * Create many entities.
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the bulk array of entities to create.
   * @returns A promise resolving to an array of created entities.
   */
  public async createMany(
    req: CrudRequestInterface,
    dto: CrudCreateManyInterface<T | Partial<T>>,
  ): Promise<T[]> {
    /* istanbul ignore if */
    if (!isObject(dto) || !isArrayFull(dto.bulk)) {
      this.throwBadRequestException('Empty data. Nothing to save.');
    }

    const bulk = dto.bulk
      .map((one) => this.prepareEntityBeforeSave(one, req.parsed))
      .filter((d) => !isUndefined(d));

    /* istanbul ignore if */
    if (!hasLength(bulk)) {
      this.throwBadRequestException('Empty data. Nothing to save.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.repo.save<any>(bulk, { chunk: 50 });
  }

  /**
   * Update one entity.
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the updated entity data.
   * @returns A promise resolving to the updated entity.
   */
  public async updateOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T> {
    const { returnShallow } = req.options?.routes?.updateOne ?? {};
    const paramsFilters = this.getParamFilters(req.parsed);
    const found = await this.getOneOrFail(req, returnShallow);
    const toSave = { ...found, ...dto, ...paramsFilters };
    const updated = await this.repo.save(
      plainToClass(
        this.entityType,
        toSave,
        req.parsed.classTransformOptions,
      ) as unknown as DeepPartial<T>,
    );

    if (returnShallow) {
      return updated;
    } else {
      req.parsed.paramsFilter.forEach((filter) => {
        filter.value = updated[filter.field];
      });

      return this.getOneOrFail(req);
    }
  }

  /**
   * Recover one soft-deleted entity.
   *
   * @param req - The CRUD request interface.
   * @returns A promise resolving to the recovered entity.
   */
  public async recoverOne(req: CrudRequestInterface): Promise<T> {
    const found = await this.getOneOrFail(req, false, true);
    return this.repo.recover(found as unknown as DeepPartial<T>);
  }

  /**
   * Replace one entity.
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the replacement entity data.
   * @returns A promise resolving to the replaced entity.
   */
  public async replaceOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T> {
    const { returnShallow } = req.options?.routes?.replaceOne ?? {};
    const paramsFilters = this.getParamFilters(req.parsed);
    const [_, found] = await oO(this.getOneOrFail(req, returnShallow));
    const toSave = {
      ...(found || {}),
      ...dto,
      ...paramsFilters,
    };
    const replaced = await this.repo.save(
      plainToClass(
        this.entityType,
        toSave,
        req.parsed.classTransformOptions,
      ) as unknown as DeepPartial<T>,
    );

    if (returnShallow) {
      return replaced;
    } else {
      const primaryParams = this.getPrimaryParams(req.options);

      /* istanbul ignore if */
      if (!primaryParams.length) {
        return replaced;
      }

      req.parsed.search = primaryParams.reduce(
        (acc, p) => ({ ...acc, [p]: replaced[p] }),
        {},
      );
      return this.getOneOrFail(req);
    }
  }

  /**
   * Delete one entity.
   *
   * @param req - The CRUD request interface.
   * @returns A promise resolving to the deleted entity or void.
   */
  public async deleteOne(req: CrudRequestInterface): Promise<void | T> {
    const { returnDeleted } = req.options?.routes?.deleteOne ?? {};
    const found = await this.getOneOrFail(req, returnDeleted);
    const toReturn = returnDeleted
      ? plainToClass(
          this.entityType,
          { ...found },
          req.parsed.classTransformOptions,
        )
      : undefined;

    req.options?.query?.softDelete === true
      ? await this.repo.softRemove(found as unknown as DeepPartial<T>)
      : await this.repo.remove(found);

    return toReturn;
  }

  /**
   * Get parameter filters from parsed request.
   *
   * @param parsed - The parsed request parameters.
   * @returns An object containing parameter filters.
   */
  public getParamFilters(
    parsed: CrudRequestInterface['parsed'],
  ): LiteralObject {
    const filters: Record<string, unknown> = {};

    /* istanbul ignore else */
    if (hasLength(parsed.paramsFilter)) {
      for (const filter of parsed.paramsFilter) {
        filters[filter.field] = filter.value;
      }
    }

    return filters;
  }

  /**
   * Create a TypeORM QueryBuilder for the entity.
   *
   * @param parsed - The parsed request parameters.
   * @param options - CRUD request options.
   * @param many - Whether to query for many entities (default: true).
   * @param withDeleted - Whether to include soft-deleted entities (default: false).
   * @returns A promise resolving to a SelectQueryBuilder instance.
   */
  public async createBuilder(
    parsed: CrudRequestParsedParamsInterface,
    options: CrudRequestOptionsInterface,
    many = true,
    withDeleted = false,
  ): Promise<SelectQueryBuilder<T>> {
    // create query builder
    const builder = this.repo.createQueryBuilder(this.alias);
    // get select fields
    const select = this.getSelect(parsed, options.query ?? {});
    // select fields
    builder.select(select);

    // search
    this.setSearchCondition(builder, parsed.search ?? {});

    // if soft deleted is enabled add where statement to filter deleted records
    if (this.entityHasDeleteColumn && options?.query?.softDelete) {
      if (parsed.includeDeleted === 1 || withDeleted) {
        builder.withDeleted();
      }
    }

    /* istanbul ignore else */
    if (many) {
      // set sort (order by)
      const sort = this.getSort(parsed, options.query ?? {});
      builder.orderBy(sort);

      // set take
      const take = this.getTake(parsed, options.query ?? {});
      /* istanbul ignore else */
      if (take && isFinite(take)) {
        builder.take(take);
      }

      // set skip
      const skip = this.getSkip(parsed, take);
      /* istanbul ignore else */
      if (skip && isFinite(skip)) {
        builder.skip(skip);
      }
    }

    // set cache
    /* istanbul ignore else */
    if (options?.query?.cache && parsed.cache !== 0) {
      builder.cache(builder.getQueryAndParameters(), options.query.cache);
    }

    return builder;
  }

  /**
   * depends on paging call `SelectQueryBuilder#getMany` or `SelectQueryBuilder#getManyAndCount`
   * helpful for overriding `CrudAdapter#getMany`
   *
   * @see getMany
   * @see SelectQueryBuilder#getMany
   * @see SelectQueryBuilder#getManyAndCount
   * @param builder - Select Query Builder for the entity
   * @param query - Parsed request parameters
   * @param options - CRUD request options
   */
  protected async doGetMany(
    builder: SelectQueryBuilder<T>,
    query: CrudRequestParsedParamsInterface,
    options: CrudRequestOptionsInterface,
  ): Promise<CrudResponsePaginatedInterface<T> | T[]> {
    if (this.decidePagination(query, options)) {
      const [data, total] = await builder.getManyAndCount();
      const limit = builder.expressionMap.take;
      const offset = builder.expressionMap.skip;

      return this.createPageInfo(data, total, limit || total, offset || 0);
    }

    return builder.getMany();
  }

  protected onInitMapEntityColumns() {
    this.entityColumns = this.repo.metadata.columns.map((prop) => {
      // In case column is an embedded, use the propertyPath to get complete path
      if (prop.embeddedMetadata) {
        this.entityColumnsHash[prop.propertyPath] = prop.databasePath;
        return prop.propertyPath;
      }
      this.entityColumnsHash[prop.propertyName] = prop.databasePath;
      return prop.propertyName;
    });
    this.entityPrimaryColumns = this.repo.metadata.columns
      .filter((prop) => prop.isPrimary)
      .map((prop) => prop.propertyName);
    this.entityHasDeleteColumn =
      this.repo.metadata.columns.filter((prop) => prop.isDeleteDate).length > 0;
  }

  protected async getOneOrFail(
    req: CrudRequestInterface,
    shallow = false,
    withDeleted = false,
  ): Promise<T> {
    const { parsed, options } = req;
    const builder = shallow
      ? this.repo.createQueryBuilder(this.alias)
      : await this.createBuilder(parsed, options, true, withDeleted);

    if (shallow) {
      this.setSearchCondition(builder, parsed.search ?? {});
    }

    const found = withDeleted
      ? await builder.withDeleted().getOne()
      : await builder.getOne();

    if (found) {
      return found;
    } else {
      throw new NotFoundException(`${this.alias} not found`);
    }
  }

  protected prepareEntityBeforeSave(
    dto: T | Partial<T>,
    parsed: CrudRequestInterface['parsed'],
  ): T | undefined {
    /* istanbul ignore if */
    if (!isObject(dto)) {
      return undefined;
    }

    if (hasLength(parsed.paramsFilter)) {
      for (const filter of parsed.paramsFilter) {
        if (filter.field in dto) {
          (dto as Record<string, unknown>)[filter.field] = filter.value;
        }
      }
    }

    /* istanbul ignore if */
    if (!hasLength(objKeys(dto))) {
      return undefined;
    }

    return dto instanceof this.entityType
      ? Object.assign(dto)
      : plainToClass(this.entityType, { ...dto }, parsed.classTransformOptions);
  }

  protected getAllowedColumns(
    columns: string[],
    options: CrudQueryOptionsInterface,
  ): string[] {
    return (!options.exclude || !options.exclude.length) &&
      (!options.allow || /* istanbul ignore next */ !options.allow.length)
      ? columns
      : columns.filter(
          (column) =>
            (options.exclude && options.exclude.length
              ? !options.exclude.some((col) => col === column)
              : /* istanbul ignore next */ true) &&
            (options.allow && options.allow.length
              ? options.allow.some((col) => col === column)
              : /* istanbul ignore next */ true),
        );
  }

  protected getEntityColumns(entityMetadata: EntityMetadata): {
    columns: string[];
    primaryColumns: string[];
  } {
    const columns =
      entityMetadata.columns.map((prop) => prop.propertyPath) ||
      /* istanbul ignore next */ [];
    const primaryColumns =
      entityMetadata.primaryColumns.map((prop) => prop.propertyPath) ||
      /* istanbul ignore next */ [];

    return { columns, primaryColumns };
  }

  protected setAndWhere(
    cond: QueryFilter,
    i: unknown,
    builder: SelectQueryBuilder<T>,
  ) {
    const { str, params } = this.mapOperatorsToQuery(cond, `andWhere${i}`);
    builder.andWhere(str, params);
  }

  protected setOrWhere(
    cond: QueryFilter,
    i: unknown,
    builder: SelectQueryBuilder<T>,
  ) {
    const { str, params } = this.mapOperatorsToQuery(cond, `orWhere${i}`);
    builder.orWhere(str, params);
  }

  protected setSearchCondition(
    builder: SelectQueryBuilder<T>,
    search: SCondition,
    condition: SConditionKey = '$and',
  ) {
    /* istanbul ignore else */
    if (isObject(search)) {
      const keys = objKeys(search);
      /* istanbul ignore else */
      if (keys.length) {
        // search: {$and: [...], ...}
        if (search?.$and && isArrayFull(search.$and)) {
          // search: {$and: [{}]}
          if (search.$and.length === 1) {
            this.setSearchCondition(builder, search.$and[0], condition);
          }
          // search: {$and: [{}, {}, ...]}
          else {
            this.builderAddBrackets(
              builder,
              condition,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              new Brackets((qb: any) => {
                search.$and?.forEach((item: SCondition) => {
                  this.setSearchCondition(qb, item, '$and');
                });
              }),
            );
          }
        }
        // search: {$or: [...], ...}
        else if (isArrayFull(search.$or)) {
          // search: {$or: [...]}
          if (keys.length === 1) {
            // search: {$or: [{}]}
            if (search.$or?.length === 1) {
              this.setSearchCondition(builder, search.$or[0], condition);
            }
            // search: {$or: [{}, {}, ...]}
            else {
              this.builderAddBrackets(
                builder,
                condition,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new Brackets((qb: any) => {
                  search.$or?.forEach((item: SCondition) => {
                    this.setSearchCondition(qb, item, '$or');
                  });
                }),
              );
            }
          }
          // search: {$or: [...], foo, ...}
          else {
            this.builderAddBrackets(
              builder,
              condition,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              new Brackets((qb: any) => {
                keys.forEach((field: string) => {
                  if (field !== '$or') {
                    const value = search[field];
                    if (!isObject(value)) {
                      this.builderSetWhere(qb, '$and', field, value);
                    } else {
                      this.setSearchFieldObjectCondition(
                        qb,
                        '$and',
                        field,
                        value,
                      );
                    }
                  } else {
                    if (search.$or?.length === 1) {
                      this.setSearchCondition(builder, search.$or[0], '$and');
                    } else {
                      this.builderAddBrackets(
                        qb,
                        '$and',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        new Brackets((qb2: any) => {
                          search.$or?.forEach((item: SCondition) => {
                            this.setSearchCondition(qb2, item, '$or');
                          });
                        }),
                      );
                    }
                  }
                });
              }),
            );
          }
        }
        // search: {...}
        else {
          // search: {foo}
          if (keys.length === 1) {
            const field = keys[0];
            const value = search[field];
            if (!isObject(value)) {
              this.builderSetWhere(builder, condition, field, value);
            } else {
              this.setSearchFieldObjectCondition(
                builder,
                condition,
                field,
                value,
              );
            }
          }
          // search: {foo, ...}
          else {
            this.builderAddBrackets(
              builder,
              condition,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              new Brackets((qb: any) => {
                keys.forEach((field: string) => {
                  const value = search[field];
                  if (!isObject(value)) {
                    this.builderSetWhere(qb, '$and', field, value);
                  } else {
                    this.setSearchFieldObjectCondition(
                      qb,
                      '$and',
                      field,
                      value,
                    );
                  }
                });
              }),
            );
          }
        }
      }
    }
  }

  protected builderAddBrackets(
    builder: SelectQueryBuilder<T>,
    condition: SConditionKey,
    brackets: Brackets,
  ) {
    if (condition === '$and') {
      builder.andWhere(brackets);
    } else {
      builder.orWhere(brackets);
    }
  }

  protected builderSetWhere(
    builder: SelectQueryBuilder<T>,
    condition: SConditionKey,
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    operator: ComparisonOperator = '$eq',
  ) {
    const time = process.hrtime();
    const index = `${field}${time[0]}${time[1]}`;
    const condFilter = {
      field,
      operator: isNull(value) ? '$isnull' : operator,
      value,
    };

    if (condition === '$and') {
      this.setAndWhere(condFilter, index, builder);
    } else {
      this.setOrWhere(condFilter, index, builder);
    }
  }

  protected setSearchFieldObjectCondition(
    builder: SelectQueryBuilder<T>,
    condition: SConditionKey,
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: any,
  ) {
    /* istanbul ignore else */
    if (isObject(object)) {
      const operators = comparisonOperatorKeys(object);

      if (operators.length === 1) {
        const operator: ComparisonOperator = operators[0];
        const value = object[operator];

        if (isObject(object.$or)) {
          const orKeys = objKeys(object.$or);
          this.setSearchFieldObjectCondition(
            builder,
            orKeys.length === 1 ? condition : '$or',
            field,
            object.$or,
          );
        } else {
          this.builderSetWhere(builder, condition, field, value, operator);
        }
      } else {
        /* istanbul ignore else */
        if (operators.length > 1) {
          this.builderAddBrackets(
            builder,
            condition,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Brackets((qb: any) => {
              operators.forEach((operator: ComparisonOperator) => {
                const value = object[operator];

                if (operator !== '$or') {
                  this.builderSetWhere(qb, condition, field, value, operator);
                } else {
                  const orKeys = objKeys(object.$or);

                  if (orKeys.length === 1) {
                    this.setSearchFieldObjectCondition(
                      qb,
                      condition,
                      field,
                      object.$or,
                    );
                  } else {
                    this.builderAddBrackets(
                      qb,
                      condition,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      new Brackets((qb2: any) => {
                        this.setSearchFieldObjectCondition(
                          qb2,
                          '$or',
                          field,
                          object.$or,
                        );
                      }),
                    );
                  }
                }
              });
            }),
          );
        }
      }
    }
  }

  protected getSelect(
    query: CrudRequestParsedParamsInterface,
    options: CrudQueryOptionsInterface,
  ): string[] {
    const allowed = this.getAllowedColumns(this.entityColumns, options);

    const columns =
      query.fields && query.fields.length
        ? query.fields.filter((field) => allowed.some((col) => field === col))
        : allowed;

    const select = new Set(
      [
        ...(options.persist && options.persist.length ? options.persist : []),
        ...columns,
        ...this.entityPrimaryColumns,
      ].map((col) => `${this.alias}.${col}`),
    );

    return Array.from(select);
  }

  protected getSort(
    query: CrudRequestParsedParamsInterface,
    options: CrudQueryOptionsInterface,
  ): OrderByCondition {
    return query.sort && query.sort.length
      ? this.mapSort(query.sort)
      : options.sort && options.sort.length
      ? this.mapSort(options.sort)
      : {};
  }

  protected getFieldWithAlias(field: string, sort = false) {
    /* istanbul ignore next */
    const i = ['mysql', 'mariadb'].includes(this.dbName) ? '`' : '"';
    const cols = field.split('.');

    switch (cols.length) {
      case 1:
        if (sort) {
          return `${this.alias}.${field}`;
        }

        const dbColName =
          this.entityColumnsHash[field] !== field
            ? this.entityColumnsHash[field]
            : field;

        return `${i}${this.alias}${i}.${i}${dbColName}${i}`;
      case 2:
        return field;
      default:
        return cols.slice(cols.length - 2, cols.length).join('.');
    }
  }

  protected mapSort(sort: QuerySort[]): OrderByCondition {
    const params: OrderByCondition = {};

    for (let i = 0; i < sort.length; i++) {
      const field = this.getFieldWithAlias(sort[i].field, true);
      const checkedFiled = this.checkSqlInjection(field);
      params[checkedFiled] = sort[i].order;
    }

    return params;
  }

  protected mapOperatorsToQuery(
    cond: QueryFilter,
    param: string,
  ): { str: string; params: LiteralObject } {
    const field = this.getFieldWithAlias(cond.field);
    const likeOperator =
      this.dbName === 'postgres' ? 'ILIKE' : /* istanbul ignore next */ 'LIKE';
    let str: string;
    let params: LiteralObject | undefined = undefined;

    if (cond.operator[0] !== '$') {
      cond.operator = ('$' + cond.operator) as ComparisonOperator;
    }

    switch (cond.operator) {
      case '$eq':
        str = `${field} = :${param}`;
        break;

      case '$ne':
        str = `${field} != :${param}`;
        break;

      case '$gt':
        str = `${field} > :${param}`;
        break;

      case '$lt':
        str = `${field} < :${param}`;
        break;

      case '$gte':
        str = `${field} >= :${param}`;
        break;

      case '$lte':
        str = `${field} <= :${param}`;
        break;

      case '$starts':
        str = `${field} LIKE :${param}`;
        params = { [param]: `${cond.value}%` };
        break;

      case '$ends':
        str = `${field} LIKE :${param}`;
        params = { [param]: `%${cond.value}` };
        break;

      case '$cont':
        str = `${field} LIKE :${param}`;
        params = { [param]: `%${cond.value}%` };
        break;

      case '$excl':
        str = `${field} NOT LIKE :${param}`;
        params = { [param]: `%${cond.value}%` };
        break;

      case '$in':
        this.checkFilterIsArray(cond);
        str = `${field} IN (:...${param})`;
        break;

      case '$notin':
        this.checkFilterIsArray(cond);
        str = `${field} NOT IN (:...${param})`;
        break;

      case '$isnull':
        str = `${field} IS NULL`;
        params = {};
        break;

      case '$notnull':
        str = `${field} IS NOT NULL`;
        params = {};
        break;

      case '$between':
        this.checkFilterIsArray(cond, cond.value.length !== 2);
        str = `${field} BETWEEN :${param}0 AND :${param}1`;
        params = {
          [`${param}0`]: cond.value[0],
          [`${param}1`]: cond.value[1],
        };
        break;

      // case insensitive
      case '$eqL':
        str = `LOWER(${field}) = :${param}`;
        break;

      case '$neL':
        str = `LOWER(${field}) != :${param}`;
        break;

      case '$startsL':
        str = `LOWER(${field}) ${likeOperator} :${param}`;
        params = { [param]: `${cond.value}%` };
        break;

      case '$endsL':
        str = `LOWER(${field}) ${likeOperator} :${param}`;
        params = { [param]: `%${cond.value}` };
        break;

      case '$contL':
        str = `LOWER(${field}) ${likeOperator} :${param}`;
        params = { [param]: `%${cond.value}%` };
        break;

      case '$exclL':
        str = `LOWER(${field}) NOT ${likeOperator} :${param}`;
        params = { [param]: `%${cond.value}%` };
        break;

      case '$inL':
        this.checkFilterIsArray(cond);
        str = `LOWER(${field}) IN (:...${param})`;
        break;

      case '$notinL':
        this.checkFilterIsArray(cond);
        str = `LOWER(${field}) NOT IN (:...${param})`;
        break;

      /* istanbul ignore next */
      default:
        str = `${field} = :${param}`;
        break;
    }

    if (typeof params === 'undefined') {
      params = { [param]: cond.value };
    }

    return { str, params };
  }

  private checkFilterIsArray(cond: QueryFilter, withLength?: boolean) {
    /* istanbul ignore if */
    if (
      !Array.isArray(cond.value) ||
      !cond.value.length ||
      (!isNil(withLength) ? withLength : false)
    ) {
      this.throwBadRequestException(`Invalid column '${cond.field}' value`);
    }
  }

  private checkSqlInjection(field: string): string {
    /* istanbul ignore else */
    if (this.sqlInjectionRegEx.length) {
      for (let i = 0; i < this.sqlInjectionRegEx.length; i++) {
        /* istanbul ignore else */
        if (this.sqlInjectionRegEx[0].test(field)) {
          this.throwBadRequestException(`SQL injection detected: "${field}"`);
        }
      }
    }

    return field;
  }
}

import { oO } from '@zmotivat0r/o0';
import { plainToInstance } from 'class-transformer';
import {
  Brackets,
  SelectQueryBuilder,
  DataSourceOptions,
  OrderByCondition,
  WhereExpressionBuilder,
} from 'typeorm';

import {
  BadRequestException,
  NotFoundException,
  PlainLiteralObject,
  Type,
} from '@nestjs/common';
import {
  isNil,
  isObject,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';

import { TypeOrmRepositoryAdapter } from '@concepta/nestjs-typeorm-ext';

import { CrudEntityColumn } from '../../crud.types';
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
  Entity extends PlainLiteralObject,
> extends CrudAdapter<Entity> {
  protected dbName: DataSourceOptions['type'];

  protected entityColumns: CrudEntityColumn<Entity>[] = [];

  protected entityPrimaryColumns: CrudEntityColumn<Entity>[] = [];

  protected entityHasDeleteColumn = false;

  protected entityColumnsHash: Record<string, unknown> = {};

  protected sqlInjectionRegEx: RegExp[] = [
    /(%27)|(')|(--)|(%23)|(#)/gi,
    /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/gi,
    /w*((%27)|')((%6F)|o|(%4F))((%72)|r|(%52))/gi,
    /((%27)|')union/gi,
  ];

  constructor(protected repoAdapter: TypeOrmRepositoryAdapter<Entity>) {
    super();

    this.dbName = this.repoAdapter.repo.metadata.connection.options.type;
    this.onInitMapEntityColumns();
  }

  public entityName(): string {
    return this.repoAdapter.repo.metadata.name;
  }

  public entityType(): Type<Entity> {
    return this.repoAdapter.repo.target as Type<Entity>;
  }

  protected get alias(): string {
    return this.repoAdapter.repo.metadata.targetName;
  }

  /**
   * Get many
   *
   * @param req - The CRUD request interface.
   */
  public async getMany(
    req: CrudRequestInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const { parsed, options } = req;
    const builder = await this.createBuilder(parsed, options);
    return this.doGetMany(builder);
  }

  /**
   * Get one
   *
   * @param req - The CRUD request interface.
   */
  public async getOne(req: CrudRequestInterface<Entity>): Promise<Entity> {
    return this.getOneOrFail(req);
  }

  /**
   * Create one
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the entity data to create.
   */
  public async createOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity> {
    const { returnShallow } = req.options.routes?.createOne ?? {};
    const entity = this.prepareEntityBeforeSave(dto, req.parsed);

    if (!entity) {
      throw new BadRequestException();
    }

    // Use RepositoryInterface
    const saved = await this.repoAdapter.save(entity);

    if (returnShallow) {
      return saved;
    } else {
      const primaryParams = this.getPrimaryParams(req.options);

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
    req: CrudRequestInterface<Entity>,
    dto: CrudCreateManyInterface<Entity | Partial<Entity>>,
  ): Promise<Entity[]> {
    if (!isObject(dto) || !Array.isArray(dto.bulk) || !dto.bulk.length) {
      this.throwBadRequestException('Empty data. Nothing to save.');
    }

    const preparedBulk = dto.bulk.map((one) =>
      this.prepareEntityBeforeSave(one, req.parsed),
    );

    const bulk: Entity[] = preparedBulk.filter(
      (d): d is Entity => !isUndefined(d),
    );

    if (!bulk.length) {
      this.throwBadRequestException('Empty data. Nothing to save.');
    }

    return this.repoAdapter.save<Entity>(bulk, { chunk: 50 });
  }

  /**
   * Update one entity.
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the updated entity data.
   * @returns A promise resolving to the updated entity.
   */
  public async updateOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity> {
    const { returnShallow } = req.options?.routes?.updateOne ?? {};
    const paramsFilters = this.getParamFilters(req.parsed);
    const found = await this.getOneOrFail(req, returnShallow);
    const toSave = { ...found, ...dto, ...paramsFilters };

    const updated = await this.repoAdapter.save(
      plainToInstance(
        this.entityType(),
        toSave,
        req.parsed.classTransformOptions,
      ),
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
  public async recoverOne(req: CrudRequestInterface<Entity>): Promise<Entity> {
    const found = await this.getOneOrFail(req, false, true);
    return this.repoAdapter.recover(found);
  }

  /**
   * Replace one entity.
   *
   * @param req - The CRUD request interface.
   * @param dto - The DTO containing the replacement entity data.
   * @returns A promise resolving to the replaced entity.
   */
  public async replaceOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity> {
    const { returnShallow } = req.options?.routes?.replaceOne ?? {};
    const paramsFilters = this.getParamFilters(req.parsed);
    const [_, found] = await oO(this.getOneOrFail(req, returnShallow));
    const toSave = {
      ...(found || {}),
      ...dto,
      ...paramsFilters,
    };

    const replaced = await this.repoAdapter.save(
      plainToInstance(
        this.entityType(),
        toSave,
        req.parsed.classTransformOptions,
      ),
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
  public async deleteOne(
    req: CrudRequestInterface<Entity>,
  ): Promise<void | Entity> {
    const { returnDeleted } = req.options?.routes?.deleteOne ?? {};
    const found = await this.getOneOrFail(req, returnDeleted);
    const toReturn = returnDeleted
      ? plainToInstance(
          this.entityType(),
          { ...found },
          req.parsed.classTransformOptions,
        )
      : undefined;

    if (req.options?.query?.softDelete === true) {
      await this.repoAdapter.softRemove(found);
    } else {
      await this.repoAdapter.remove(found);
    }

    return toReturn;
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
    parsed: CrudRequestParsedParamsInterface<Entity>,
    options: CrudRequestOptionsInterface<Entity>,
    many = true,
    withDeleted = false,
  ): Promise<SelectQueryBuilder<Entity>> {
    // create query builder
    const builder = this.repoAdapter.repo.createQueryBuilder(this.alias);
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
   */
  protected async doGetMany(
    builder: SelectQueryBuilder<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const [data, total] = await builder.getManyAndCount();
    const limit = builder.expressionMap.take;
    const offset = builder.expressionMap.skip;

    return this.createPageInfo(data, total, limit || total, offset || 0);
  }

  protected onInitMapEntityColumns() {
    this.entityColumns = this.repoAdapter.repo.metadata.columns.map((prop) => {
      // In case column is an embedded, use the propertyPath to get complete path
      if (prop.embeddedMetadata) {
        this.entityColumnsHash[prop.propertyPath] = prop.databasePath;
        return prop.propertyPath;
      }
      this.entityColumnsHash[prop.propertyName] = prop.databasePath;
      return prop.propertyName;
    });
    this.entityPrimaryColumns = this.repoAdapter.repo.metadata.columns
      .filter((prop) => prop.isPrimary)
      .map((prop) => prop.propertyName);
    this.entityHasDeleteColumn =
      this.repoAdapter.repo.metadata.columns.filter((prop) => prop.isDeleteDate)
        .length > 0;
  }

  protected async getOneOrFail(
    req: CrudRequestInterface<Entity>,
    shallow = false,
    withDeleted = false,
  ): Promise<Entity> {
    const { parsed, options } = req;
    const builder = shallow
      ? this.repoAdapter.repo.createQueryBuilder(this.alias)
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

  protected setAndWhere(
    cond: QueryFilter<Entity>,
    i: unknown,
    builder: WhereExpressionBuilder,
  ) {
    const { str, params } = this.mapOperatorsToQuery(cond, `andWhere${i}`);
    builder.andWhere(str, params);
  }

  protected setOrWhere(
    cond: QueryFilter<Entity>,
    i: unknown,
    builder: WhereExpressionBuilder,
  ) {
    const { str, params } = this.mapOperatorsToQuery(cond, `orWhere${i}`);
    builder.orWhere(str, params);
  }

  protected setSearchCondition(
    builder: WhereExpressionBuilder,
    search: SCondition<Entity>,
    condition: SConditionKey = '$and',
  ) {
    /* istanbul ignore else */
    if (isObject(search)) {
      const keys = Object.keys(search);
      /* istanbul ignore else */
      if (keys.length) {
        // search: {$and: [...], ...}
        if (search?.$and && Array.isArray(search.$and) && search.$and.length) {
          // search: {$and: [{}]}
          if (search.$and.length === 1) {
            this.setSearchCondition(builder, search.$and[0], condition);
          }
          // search: {$and: [{}, {}, ...]}
          else {
            this.builderAddBrackets(
              builder,
              condition,
              new Brackets((qb) => {
                search.$and?.forEach((item: SCondition<Entity>) => {
                  this.setSearchCondition(qb, item, '$and');
                });
              }),
            );
          }
        }
        // search: {$or: [...], ...}
        else if (Array.isArray(search.$or) && search.$or.length) {
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
                new Brackets((qb) => {
                  search.$or?.forEach((item: SCondition<Entity>) => {
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
              new Brackets((qb) => {
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
                        new Brackets((qb2) => {
                          search.$or?.forEach((item: SCondition<Entity>) => {
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
              new Brackets((qb) => {
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
    builder: WhereExpressionBuilder,
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
    builder: WhereExpressionBuilder,
    condition: SConditionKey,
    field: string,
    value: unknown,
    operator: ComparisonOperator = '$eq',
  ) {
    const time = process.hrtime();
    const index = `${field}${time[0]}${time[1]}`;
    const condFilter = {
      field,
      operator: value === null ? '$isnull' : operator,
      value,
    };

    if (condition === '$and') {
      this.setAndWhere(condFilter, index, builder);
    } else {
      this.setOrWhere(condFilter, index, builder);
    }
  }

  protected setSearchFieldObjectCondition(
    builder: WhereExpressionBuilder,
    condition: SConditionKey,
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: { [k: string]: any; $or?: any; $and?: any },
  ) {
    /* istanbul ignore else */
    if (isObject(object)) {
      const operators = comparisonOperatorKeys(object);

      if (operators.length === 1) {
        const operator: ComparisonOperator = operators[0];
        const value = object[operator];

        if (isObject(object.$or)) {
          const orKeys = Object.keys(object.$or);
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
            new Brackets((qb) => {
              operators.forEach((operator: ComparisonOperator) => {
                const value = object[operator];

                if (operator !== '$or') {
                  this.builderSetWhere(qb, condition, field, value, operator);
                } else {
                  const orKeys = Object.keys(object.$or);

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
                      new Brackets((qb2) => {
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
    query: CrudRequestParsedParamsInterface<Entity>,
    options: CrudQueryOptionsInterface<Entity>,
  ): CrudEntityColumn<Entity>[] {
    const allowed = this.getAllowedColumns(this.entityColumns, options);

    const columns =
      query.fields && query.fields.length
        ? query.fields.filter((field) => allowed.some((col) => field === col))
        : allowed;

    const selectArray: CrudEntityColumn<Entity>[] = [
      ...(options.persist && options.persist.length ? options.persist : []),
      ...columns,
      ...this.entityPrimaryColumns,
    ];

    const selectMapped = selectArray.map(
      (col) => `${this.alias}.${String(col)}`,
    );

    const select = new Set(selectMapped);

    return Array.from(select);
  }

  protected getSort(
    query: CrudRequestParsedParamsInterface<Entity>,
    options: CrudQueryOptionsInterface<Entity>,
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
      case 1: {
        if (sort) {
          return `${this.alias}.${field}`;
        }

        const dbColName =
          this.entityColumnsHash[field] !== field
            ? this.entityColumnsHash[field]
            : field;

        return `${i}${this.alias}${i}.${i}${dbColName}${i}`;
      }
      case 2:
        return field;
      default:
        return cols.slice(cols.length - 2, cols.length).join('.');
    }
  }

  protected mapSort(sort: QuerySort<Entity>[]): OrderByCondition {
    const params: OrderByCondition = {};

    for (let i = 0; i < sort.length; i++) {
      const field = this.getFieldWithAlias(sort[i].field, true);
      const checkedFiled = this.checkSqlInjection(field);
      params[checkedFiled] = sort[i].order;
    }

    return params;
  }

  protected mapOperatorsToQuery(
    cond: QueryFilter<Entity>,
    param: string,
  ): { str: string; params: PlainLiteralObject } {
    const field = this.getFieldWithAlias(cond.field);

    const likeOperator = this.dbName === 'postgres' ? 'ILIKE' : 'LIKE';

    let str: string;
    let params: PlainLiteralObject | undefined = undefined;

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
        if (!Array.isArray(cond.value) || cond.value.length !== 2) {
          throw new BadRequestException(
            `Invalid column '${cond.field}' value for BETWEEN operator, must be an array with two elements`,
          );
        }

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

  private checkSqlInjection(field: string): string {
    if (this.sqlInjectionRegEx.length) {
      for (let i = 0; i < this.sqlInjectionRegEx.length; i++) {
        if (this.sqlInjectionRegEx[0].test(field)) {
          this.throwBadRequestException(`SQL injection detected: "${field}"`);
        }
      }
    }

    return field;
  }
}

import { plainToClass } from 'class-transformer';

import { BadRequestException, PlainLiteralObject, Type } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';

import { CrudEntityColumn } from '../../crud.types';
import { CrudRequestParsedParamsInterface } from '../../request/interfaces/crud-request-parsed-params.interface';
import { QueryFilter } from '../../request/types/crud-request-query.types';
import { CrudCreateManyInterface } from '../interfaces/crud-create-many.interface';
import { CrudParamsOptionsInterface } from '../interfaces/crud-params-options.interface';
import { CrudQueryOptionsInterface } from '../interfaces/crud-query-options.interface';
import { CrudRequestOptionsInterface } from '../interfaces/crud-request-options.interface';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface';
import { queryFilterIsArray } from '../util';

export abstract class CrudAdapter<Entity extends PlainLiteralObject> {
  throwBadRequestException(msg?: unknown): BadRequestException {
    throw new BadRequestException(msg);
  }

  /**
   * Wrap page into page-info
   * override this method to create custom page-info response
   * or set custom `serialize.getMany` dto in the controller's CrudOption
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
   * @param query - parsed request params
   * @param options - query options
   */
  getTake(
    query: CrudRequestParsedParamsInterface<Entity>,
    options: CrudQueryOptionsInterface<Entity>,
  ): number | null {
    if (query.limit) {
      return options.maxLimit
        ? query.limit <= options.maxLimit
          ? query.limit
          : options.maxLimit
        : query.limit;
    }

    if (options.limit) {
      return options.maxLimit
        ? options.limit <= options.maxLimit
          ? options.limit
          : options.maxLimit
        : options.limit;
    }

    return options.maxLimit ? options.maxLimit : null;
  }

  /**
   * Get number of resources to be skipped
   *
   * @param query - parsed request params
   * @param take - number of resources to be fetched
   */
  getSkip(
    query: CrudRequestParsedParamsInterface<Entity>,
    take: number | null,
  ): number | null {
    return query.page && take
      ? take * (query.page - 1)
      : query.offset
        ? query.offset
        : null;
  }

  /**
   * Get primary param name from CrudOptions
   *
   * @param options - crud request options
   */
  getPrimaryParams(
    options: CrudRequestOptionsInterface<Entity>,
  ): CrudEntityColumn<Entity>[] {
    const rawParams: CrudParamsOptionsInterface<Entity> = options.params ?? {};

    const params = Object.keys(rawParams).filter(
      (n) => rawParams[n] && rawParams[n].primary,
    );

    return params
      .map((p) => rawParams[p].field)
      .filter((field): field is string => typeof field === 'string');
  }

  /**
   * Get parameter filters from parsed request.
   *
   * @param parsed - The parsed request parameters.
   * @returns An object containing parameter filters.
   */
  public getParamFilters(parsed: CrudRequestParsedParamsInterface<Entity>) {
    const filters: Partial<Record<CrudEntityColumn<Entity>, unknown>> = {};

    /* istanbul ignore else */
    if (parsed.paramsFilter.length) {
      for (const filter of parsed.paramsFilter) {
        filters[filter.field] = filter.value;
      }
    }

    return filters;
  }

  getAllowedColumns(
    columns: CrudEntityColumn<Entity>[],
    options: CrudQueryOptionsInterface<Entity>,
  ): CrudEntityColumn<Entity>[] {
    return (!options.exclude || !options.exclude.length) &&
      (!options.allow || !options.allow.length)
      ? columns
      : columns.filter(
          (column) =>
            (options.exclude && options.exclude.length
              ? !options.exclude.some((col) => col === column)
              : true) &&
            (options.allow && options.allow.length
              ? options.allow.some((col) => col === column)
              : true),
        );
  }

  checkFilterIsArray(cond: QueryFilter<Entity>): boolean {
    if (queryFilterIsArray(cond)) {
      return true;
    }

    throw new BadRequestException(`Invalid column '${cond.field}' value`);
  }

  prepareEntityBeforeSave(
    dto: Partial<Entity>,
    parsed: CrudRequestParsedParamsInterface<Entity>,
  ): Entity | undefined {
    if (!isObject(dto)) {
      return undefined;
    }

    if (parsed.paramsFilter.length) {
      for (const filter of parsed.paramsFilter) {
        if (filter.field in dto) {
          (dto as Record<string, unknown>)[filter.field] = filter.value;
        }
      }
    }

    if (!Object.keys(dto).length) {
      return undefined;
    }

    return dto instanceof this.entityType()
      ? Object.assign(dto)
      : plainToClass(
          this.entityType(),
          { ...dto },
          parsed.classTransformOptions,
        );
  }

  abstract entityType(): Type<Entity>;
  abstract entityName(): string;

  abstract getMany(
    req: CrudRequestInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>>;

  abstract getOne(req: CrudRequestInterface<Entity>): Promise<Entity>;

  abstract createOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity>;

  abstract createMany(
    req: CrudRequestInterface<Entity>,
    dto: CrudCreateManyInterface,
  ): Promise<Entity[]>;

  abstract updateOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity>;

  abstract replaceOne(
    req: CrudRequestInterface<Entity>,
    dto: Entity | Partial<Entity>,
  ): Promise<Entity>;

  abstract deleteOne(req: CrudRequestInterface<Entity>): Promise<void | Entity>;

  abstract recoverOne(
    req: CrudRequestInterface<Entity>,
  ): Promise<void | Entity>;
}

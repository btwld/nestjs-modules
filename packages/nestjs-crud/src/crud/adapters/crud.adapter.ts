import { objKeys } from '@nestjsx/util';

import { BadRequestException, PlainLiteralObject } from '@nestjs/common';

import { CrudRequestParsedParamsInterface } from '../../request/interfaces/crud-request-parsed-params.interface';
import { CrudCreateManyInterface } from '../interfaces/crud-create-many.interface';
import { CrudParamsOptionsInterface } from '../interfaces/crud-params-options.interface';
import { CrudQueryOptionsInterface } from '../interfaces/crud-query-options.interface';
import { CrudRequestOptionsInterface } from '../interfaces/crud-request-options.interface';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface';

export abstract class CrudAdapter<T extends PlainLiteralObject> {
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
    data: T[],
    total: number | undefined,
    limit: number | undefined,
    offset: number | undefined,
  ): CrudResponsePaginatedInterface<T> {
    return {
      data,
      count: data.length,
      total: total ?? 0,
      page: limit ? Math.floor((offset ?? 0) / limit) + 1 : 1,
      pageCount: limit && total ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Determine if need paging
   *
   * @param parsed - parsed request params
   * @param options - crud request options
   */
  decidePagination(
    parsed: CrudRequestParsedParamsInterface,
    options: CrudRequestOptionsInterface,
  ): boolean {
    return (
      options.query?.alwaysPaginate ||
      ((Number.isFinite(parsed.page) || Number.isFinite(parsed.offset)) &&
        /* istanbul ignore next */ !!this.getTake(parsed, options.query ?? {}))
    );
  }

  /**
   * Get number of resources to be fetched
   *
   * @param query - parsed request params
   * @param options - query options
   */
  getTake(
    query: CrudRequestParsedParamsInterface,
    options: CrudQueryOptionsInterface,
  ): number | null {
    if (query.limit) {
      return options.maxLimit
        ? query.limit <= options.maxLimit
          ? query.limit
          : options.maxLimit
        : query.limit;
    }
    /* istanbul ignore if */
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
    query: CrudRequestParsedParamsInterface,
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
  getPrimaryParams(options: CrudRequestOptionsInterface): string[] {
    const rawParams: CrudParamsOptionsInterface = options.params ?? {};

    const params = objKeys(rawParams).filter(
      (n) => rawParams[n] && rawParams[n].primary,
    );

    return params
      .map((p) => rawParams[p].field)
      .filter((field): field is string => typeof field === 'string');
  }

  abstract entityName(): string;

  abstract getMany(
    req: CrudRequestInterface,
  ): Promise<CrudResponsePaginatedInterface<T> | T[]>;

  abstract getOne(req: CrudRequestInterface): Promise<T>;

  abstract createOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T>;

  abstract createMany(
    req: CrudRequestInterface,
    dto: CrudCreateManyInterface,
  ): Promise<T[]>;

  abstract updateOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T>;

  abstract replaceOne(
    req: CrudRequestInterface,
    dto: T | Partial<T>,
  ): Promise<T>;

  abstract deleteOne(req: CrudRequestInterface): Promise<void | T>;

  abstract recoverOne(req: CrudRequestInterface): Promise<void | T>;
}

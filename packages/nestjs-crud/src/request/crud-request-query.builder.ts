import { stringify } from 'qs';

import { PlainLiteralObject } from '@nestjs/common';
import {
  isNil,
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';

import { hasValue } from '../util/validation';

import {
  validateCondition,
  validateFields,
  validateNumeric,
  validateSort,
} from './crud-request-query.validator';
import { CrudCreateQueryParamsInterface } from './interfaces/crud-create-query-params.interface';
import { CrudRequestQueryBuilderOptionsInterface } from './interfaces/crud-request-query-builder-options.interface';
import {
  QueryFields,
  QueryFilter,
  QueryFilterArr,
  QuerySort,
  QuerySortArr,
  SCondition,
} from './types/crud-request-query.types';

// tslint:disable:variable-name ban-types
export class CrudRequestQueryBuilder<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  private static _options: Required<CrudRequestQueryBuilderOptionsInterface> & {
    paramNamesMap: Required<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    > & {
      [key: string]: string | string[];
    };
  } = {
    delim: '||',
    delimStr: ',',
    paramNamesMap: {
      fields: ['fields', 'select'],
      search: 's',
      filter: 'filter',
      or: 'or',
      sort: 'sort',
      limit: ['limit', 'per_page'],
      offset: 'offset',
      page: 'page',
      cache: 'cache',
      includeDeleted: 'include_deleted',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public queryObject: Record<string, any> = {};

  public queryString = '';

  private paramNames: Record<string, string> = {};

  constructor() {
    this.setParamNames();
  }

  static setOptions(options: CrudRequestQueryBuilderOptionsInterface) {
    CrudRequestQueryBuilder._options = {
      ...CrudRequestQueryBuilder._options,
      ...options,
      paramNamesMap: {
        ...CrudRequestQueryBuilder._options.paramNamesMap,
        ...(options.paramNamesMap ? options.paramNamesMap : {}),
      },
    };
  }

  static getOptions() {
    return CrudRequestQueryBuilder._options;
  }

  static create<T extends PlainLiteralObject>(
    params?: CrudCreateQueryParamsInterface,
  ): CrudRequestQueryBuilder<T> {
    const qb = new CrudRequestQueryBuilder();
    return isObject(params) && params !== undefined
      ? qb.createFromParams(params)
      : qb;
  }

  get options(): CrudRequestQueryBuilderOptionsInterface {
    return CrudRequestQueryBuilder._options;
  }

  setParamNames() {
    Object.keys(CrudRequestQueryBuilder._options.paramNamesMap).forEach(
      (key) => {
        const name = CrudRequestQueryBuilder._options.paramNamesMap[key];
        this.paramNames[key] = isString(name) ? name : name[0];
      },
    );
  }

  getParamNames() {
    Object.keys(CrudRequestQueryBuilder._options.paramNamesMap).forEach(
      (key) => {
        const name = CrudRequestQueryBuilder._options.paramNamesMap[key];
        this.paramNames[key] = isString(name) ? name : name[0];
      },
    );
  }

  query(encode = true): string {
    if (this.paramNames.search && this.queryObject[this.paramNames.search]) {
      if (this.paramNames.filter) {
        this.queryObject[this.paramNames.filter] = undefined;
      }

      if (this.paramNames.or) {
        this.queryObject[this.paramNames.or] = undefined;
      }
    }
    this.queryString = stringify(this.queryObject, { encode });

    return this.queryString;
  }

  select(fields: QueryFields<Entity>): this {
    if (Array.isArray(fields) && fields.length && this.paramNames.fields) {
      validateFields(fields);
      this.queryObject[this.paramNames.fields] = fields.join(
        this.options.delimStr,
      );
    }
    return this;
  }

  search(s: SCondition<Entity>) {
    if (!isNil(s) && isObject(s) && this.paramNames.search) {
      this.queryObject[this.paramNames.search] = JSON.stringify(s);
    }
    return this;
  }

  setFilter(
    f:
      | QueryFilter<Entity>
      | QueryFilterArr<Entity>
      | Array<QueryFilter<Entity> | QueryFilterArr<Entity>>,
  ): this {
    this.setCondition(f, 'filter');
    return this;
  }

  setOr(
    f:
      | QueryFilter<Entity>
      | QueryFilterArr<Entity>
      | Array<QueryFilter<Entity> | QueryFilterArr<Entity>>,
  ): this {
    this.setCondition(f, 'or');
    return this;
  }

  sortBy(
    s:
      | QuerySort<Entity>
      | QuerySortArr<Entity>
      | Array<QuerySort<Entity> | QuerySortArr<Entity>>,
  ): this {
    if (!isNil(s)) {
      const param = this.checkQueryObjectParam('sort', []);
      if (param) {
        this.queryObject[param] = [
          ...this.queryObject[param],
          ...(Array.isArray(s) && !isString(s[0])
            ? (s as Array<QuerySort<Entity> | QuerySortArr<Entity>>).map((o) =>
                this.addSortBy(o),
              )
            : [this.addSortBy(s as QuerySort<Entity> | QuerySortArr<Entity>)]),
        ];
      }
    }
    return this;
  }

  setLimit(n: number): this {
    this.setNumeric(n, 'limit');
    return this;
  }

  setOffset(n: number): this {
    this.setNumeric(n, 'offset');
    return this;
  }

  setPage(n: number): this {
    this.setNumeric(n, 'page');
    return this;
  }

  resetCache(): this {
    this.setNumeric(0, 'cache');
    return this;
  }

  setIncludeDeleted(n: number): this {
    this.setNumeric(n, 'includeDeleted');
    return this;
  }

  cond(
    f: QueryFilter<Entity> | QueryFilterArr<Entity>,
    cond: 'filter' | 'or' | 'search' = 'search',
  ): string {
    const filter = Array.isArray(f)
      ? { field: f[0], operator: f[1], value: f[2] }
      : f;
    validateCondition(filter, cond);
    const d = this.options.delim ?? CrudRequestQueryBuilder._options.delim;

    return (
      filter.field +
      d +
      filter.operator +
      (hasValue(filter.value) ? d + filter.value : '')
    );
  }

  private addSortBy(s: QuerySort<Entity> | QuerySortArr<Entity>): string {
    const sort: QuerySort<Entity> = Array.isArray(s)
      ? { field: s[0], order: s[1] }
      : s;
    validateSort(sort);
    const ds = this.options.delimStr;

    return sort.field + ds + sort.order;
  }

  private createFromParams(params: CrudCreateQueryParamsInterface): this {
    if (params.fields) {
      this.select(params.fields);
    }

    if (params.search) {
      this.search(params.search);
    }

    if (params.filter) {
      this.setFilter(params.filter);
    }

    if (params.or) {
      this.setOr(params.or);
    }

    if (params.limit) {
      this.setLimit(params.limit);
    }

    if (params.offset) {
      this.setOffset(params.offset);
    }

    if (params.page) {
      this.setPage(params.page);
    }

    if (params.sort) {
      this.sortBy(params.sort);
    }

    if (params.resetCache) {
      this.resetCache();
    }

    if (params.includeDeleted) {
      this.setIncludeDeleted(params.includeDeleted);
    }

    return this;
  }

  private checkQueryObjectParam(
    cond: keyof NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >,
    defaults: unknown,
  ): string | undefined {
    const param = this.paramNames[cond];

    if (param && isNil(this.queryObject[param]) && !isUndefined(defaults)) {
      this.queryObject[param] = defaults;
    }

    return param;
  }

  private setCondition(
    f:
      | QueryFilter<Entity>
      | QueryFilterArr<Entity>
      | Array<QueryFilter<Entity> | QueryFilterArr<Entity>>,
    cond: 'filter' | 'or',
  ): void {
    if (!isNil(f)) {
      const param = this.checkQueryObjectParam(cond, []);
      if (param) {
        this.queryObject[param] = [
          ...this.queryObject[param],
          ...(Array.isArray(f) && !isString(f[0])
            ? (f as Array<QueryFilter<Entity> | QueryFilterArr<Entity>>).map(
                (o) => this.cond(o, cond),
              )
            : [
                this.cond(
                  f as QueryFilter<Entity> | QueryFilterArr<Entity>,
                  cond,
                ),
              ]),
        ];
      }
    }
  }

  private setNumeric(
    n: number,
    cond: 'limit' | 'offset' | 'page' | 'cache' | 'includeDeleted',
  ): void {
    if (!isNil(n)) {
      validateNumeric(n, cond);
      const condParam = this.paramNames[cond];
      if (typeof condParam === 'string') {
        this.queryObject[condParam] = n;
      }
    }
  }
}

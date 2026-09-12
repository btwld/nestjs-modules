import { stringify } from 'qs';

import { type PlainLiteralObject } from '@nestjs/common';

import { isNil, isObject, isString, isUndefined } from '@concepta/nestjs-core';
import {
  type EntityColumn,
  type OrderSortKey,
  type OrderSortKeyArr,
  type WhereCondition,
  type WhereConditionArr,
} from '@concepta/nestjs-repository';

import { hasValue } from '../utils/validation.js';

import { COND_OPERATOR_PREFIX, type SCondition } from './crud-query.types.js';
import {
  validateCondition,
  validateFields,
  validateNumeric,
  validateSort,
} from './crud-query.validator.js';
import { type CrudCreateQueryParamsInterface } from './interfaces/crud-create-query-params.interface.js';
import { type CrudQueryBuilderOptionsInterface } from './interfaces/crud-query-builder-options.interface.js';

export class CrudQueryBuilder<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  private static _options: Required<CrudQueryBuilderOptionsInterface> & {
    paramNamesMap: Required<
      CrudQueryBuilderOptionsInterface['paramNamesMap']
    > & {
      [key: string]: string[];
    };
  } = {
    delim: '||',
    delimStr: ',',
    paramNamesMap: {
      fields: ['select'],
      search: ['s'],
      filter: ['filter'],
      or: ['or'],
      sort: ['sort'],
      limit: ['limit'],
      offset: ['offset'],
      page: ['page'],
      cache: ['cache'],
      includeDeleted: ['includeDeleted'],
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public queryObject: Record<string, any> = {};

  public queryString = '';

  private paramNames: Record<string, string> = {};

  constructor() {
    this.setParamNames();
  }

  static setOptions(options: CrudQueryBuilderOptionsInterface) {
    CrudQueryBuilder._options = {
      ...CrudQueryBuilder._options,
      ...options,
      paramNamesMap: {
        ...CrudQueryBuilder._options.paramNamesMap,
        ...(options.paramNamesMap ? options.paramNamesMap : {}),
      },
    };
  }

  static getOptions() {
    return CrudQueryBuilder._options;
  }

  static create<T extends PlainLiteralObject>(
    params?: CrudCreateQueryParamsInterface,
  ): CrudQueryBuilder<T> {
    const qb = new CrudQueryBuilder();
    return isObject(params) ? qb.createFromParams(params) : qb;
  }

  get options(): CrudQueryBuilderOptionsInterface {
    return CrudQueryBuilder._options;
  }

  setParamNames() {
    Object.keys(CrudQueryBuilder._options.paramNamesMap).forEach((key) => {
      // Use the first alias as the canonical output name for query building
      this.paramNames[key] = CrudQueryBuilder._options.paramNamesMap[key][0];
    });
  }

  query(encode = true): string {
    let output = this.queryObject;

    // When search is set, filter and or are excluded (search supersedes them)
    if (this.paramNames.search && this.queryObject[this.paramNames.search]) {
      const { ...rest } = this.queryObject;

      if (this.paramNames.filter) {
        rest[this.paramNames.filter] = undefined;
      }

      if (this.paramNames.or) {
        rest[this.paramNames.or] = undefined;
      }

      output = rest;
    }

    this.queryString = stringify(output, { encode });

    return this.queryString;
  }

  select(fields: EntityColumn<Entity>[]): this {
    if (Array.isArray(fields) && fields.length && this.paramNames.fields) {
      validateFields(fields);
      this.queryObject[this.paramNames.fields] = fields.join(
        this.options.delimStr,
      );
    }
    return this;
  }

  search(s: SCondition<Entity>): this {
    if (!isNil(s) && isObject(s) && this.paramNames.search) {
      this.queryObject[this.paramNames.search] = JSON.stringify(s);
    }
    return this;
  }

  setFilter(
    f:
      | WhereCondition<Entity>
      | WhereConditionArr<Entity>
      | Array<WhereCondition<Entity> | WhereConditionArr<Entity>>,
  ): this {
    this.setCondition(f, 'filter');
    return this;
  }

  setOr(
    f:
      | WhereCondition<Entity>
      | WhereConditionArr<Entity>
      | Array<WhereCondition<Entity> | WhereConditionArr<Entity>>,
  ): this {
    this.setCondition(f, 'or');
    return this;
  }

  sortBy(
    s:
      | OrderSortKey<Entity>
      | OrderSortKeyArr<Entity>
      | Array<OrderSortKey<Entity> | OrderSortKeyArr<Entity>>,
  ): this {
    if (!isNil(s)) {
      const param = this.checkQueryObjectParam('sort', []);
      if (param) {
        const items = this.isSortArray(s)
          ? s.map((o) => this.addSortBy(o))
          : [this.addSortBy(s)];

        this.queryObject[param] = [...this.queryObject[param], ...items];
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

  private cond(
    f: WhereCondition<Entity> | WhereConditionArr<Entity>,
    cond: 'filter' | 'or',
  ): string {
    if (!Array.isArray(f)) {
      validateCondition(f, cond);
    }

    const d = this.options.delim ?? CrudQueryBuilder._options.delim;

    if (Array.isArray(f)) {
      const [field, operator, value] = f;
      return (
        field +
        d +
        COND_OPERATOR_PREFIX +
        operator +
        (hasValue(value) ? d + value : '')
      );
    }

    const value = 'value' in f ? f.value : undefined;

    return (
      f.field +
      d +
      COND_OPERATOR_PREFIX +
      f.operator +
      (hasValue(value) ? d + value : '')
    );
  }

  private addSortBy(s: OrderSortKey<Entity> | OrderSortKeyArr<Entity>): string {
    const sort: OrderSortKey<Entity> = Array.isArray(s)
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
    cond: keyof NonNullable<CrudQueryBuilderOptionsInterface['paramNamesMap']>,
    defaults: unknown,
  ): string | undefined {
    const param = this.paramNames[cond];

    if (param && isNil(this.queryObject[param]) && !isUndefined(defaults)) {
      this.queryObject[param] = defaults;
    }

    return param;
  }

  private isSortArray(
    s:
      | OrderSortKey<Entity>
      | OrderSortKeyArr<Entity>
      | Array<OrderSortKey<Entity> | OrderSortKeyArr<Entity>>,
  ): s is Array<OrderSortKey<Entity> | OrderSortKeyArr<Entity>> {
    return Array.isArray(s) && !isString(s[0]);
  }

  private isFilterArray(
    f:
      | WhereCondition<Entity>
      | WhereConditionArr<Entity>
      | Array<WhereCondition<Entity> | WhereConditionArr<Entity>>,
  ): f is Array<WhereCondition<Entity> | WhereConditionArr<Entity>> {
    return Array.isArray(f) && !isString(f[0]);
  }

  private setCondition(
    f:
      | WhereCondition<Entity>
      | WhereConditionArr<Entity>
      | Array<WhereCondition<Entity> | WhereConditionArr<Entity>>,
    cond: 'filter' | 'or',
  ): void {
    if (!isNil(f)) {
      const param = this.checkQueryObjectParam(cond, []);
      if (param) {
        const items = this.isFilterArray(f)
          ? f.map((o) => this.cond(o, cond))
          : [this.cond(f, cond)];

        this.queryObject[param] = [...this.queryObject[param], ...items];
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

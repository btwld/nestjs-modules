import { ClassTransformOptions } from 'class-transformer';

import { PlainLiteralObject } from '@nestjs/common';
import { isNil, isObject, isString } from '@nestjs/common/utils/shared.utils';

import { hasValue, isDateString, isStringFull } from '../util/validation';

import { CrudRequestQueryBuilder } from './crud-request-query.builder';
import {
  validateCondition,
  validateNumeric,
  validateParamOption,
  validateSort,
  validateUUID,
} from './crud-request-query.validator';
import { splitSortString } from './crud-request.utils';
import { CrudRequestQueryException } from './exceptions/crud-request-query.exception';
import { CrudRequestParamsOptionsInterface } from './interfaces/crud-request-params-options.interface';
import { CrudRequestParsedParamsInterface } from './interfaces/crud-request-parsed-params.interface';
import { CrudRequestQueryBuilderOptionsInterface } from './interfaces/crud-request-query-builder-options.interface';
import {
  ComparisonOperator,
  QueryFields,
  QueryFilter,
  QuerySort,
  SCondition,
  SConditionAND,
  SFields,
} from './types/crud-request-query.types';

// tslint:disable:variable-name ban-types
export class CrudRequestQueryParser<Entity extends PlainLiteralObject>
  implements CrudRequestParsedParamsInterface<Entity>
{
  public fields: QueryFields<Entity> = [];

  public paramsFilter: QueryFilter<Entity>[] = [];

  public authPersist: PlainLiteralObject | undefined;

  public classTransformOptions: ClassTransformOptions | undefined;

  public search: SCondition<Entity> | undefined;

  public filter: QueryFilter<Entity>[] = [];

  public or: QueryFilter<Entity>[] = [];

  public sort: QuerySort<Entity>[] = [];

  public limit: number | undefined;

  public offset: number | undefined;

  public page: number | undefined;

  public cache: number | undefined;

  public includeDeleted: number | undefined;

  private _params: PlainLiteralObject = {};

  private _query: PlainLiteralObject = {};

  private _paramNames: string[] = [];

  private _paramsOptions: CrudRequestParamsOptionsInterface<Entity> | undefined;

  private get _options(): Required<CrudRequestQueryBuilderOptionsInterface> {
    return CrudRequestQueryBuilder.getOptions();
  }

  static create<T extends PlainLiteralObject>(): CrudRequestQueryParser<T> {
    return new CrudRequestQueryParser();
  }

  getParsed(): CrudRequestParsedParamsInterface<Entity> {
    return {
      fields: this.fields,
      paramsFilter: this.paramsFilter,
      classTransformOptions: this.classTransformOptions,
      search: this.search,
      filter: this.filter,
      or: this.or,
      sort: this.sort,
      limit: this.limit,
      offset: this.offset,
      page: this.page,
      cache: this.cache,
      includeDeleted: this.includeDeleted,
    };
  }

  parseQuery(query: PlainLiteralObject): this {
    if (isObject(query)) {
      const paramNames = Object.keys(query);

      if (paramNames.length) {
        this._query = query;
        this._paramNames = paramNames;
        const searchData = this._query[this.getParamNames('search')[0]];
        this.search = this.parseSearchQueryParam(searchData);
        if (isNil(this.search)) {
          this.filter = this.parseFilterQueryParam();
          this.or = this.parseOrQueryParam();
        }
        this.fields =
          this.parseQueryParam('fields', this.fieldsParser.bind(this))[0] || [];
        this.sort = this.parseSortQueryParam();
        this.limit = this.parseQueryParam(
          'limit',
          this.numericParser.bind(this, 'limit'),
        )[0];
        this.offset = this.parseQueryParam(
          'offset',
          this.numericParser.bind(this, 'offset'),
        )[0];
        this.page = this.parseQueryParam(
          'page',
          this.numericParser.bind(this, 'page'),
        )[0];
        this.cache = this.parseQueryParam(
          'cache',
          this.numericParser.bind(this, 'cache'),
        )[0];
        this.includeDeleted = this.parseQueryParam(
          'includeDeleted',
          this.numericParser.bind(this, 'includeDeleted'),
        )[0];
      }
    }

    return this;
  }

  parseParams(
    params: PlainLiteralObject,
    options: CrudRequestParamsOptionsInterface<Entity>,
  ): this {
    if (isObject(params)) {
      const paramNames = Object.keys(params);

      if (paramNames.length) {
        this._params = params;
        this._paramsOptions = options;
        this.paramsFilter = paramNames
          .map((name) => {
            return this.paramParser(name);
          })
          .filter(
            (filter): filter is QueryFilter<Entity> => filter !== undefined,
          );
      }
    }

    return this;
  }

  setAuthPersist(persist: PlainLiteralObject = {}) {
    this.authPersist = persist || /* istanbul ignore next */ {};
  }

  setClassTransformOptions(options: ClassTransformOptions = {}) {
    this.classTransformOptions = options || /* istanbul ignore next */ {};
  }

  convertFilterToSearch(
    filter: QueryFilter<Entity>,
  ): SFields<Entity> | SConditionAND<Entity> {
    return filter
      ? {
          [filter.field]: {
            // [filter.operator]: isEmptyValue[filter.operator] ? isEmptyValue[filter.operator] : filter.value,
            [filter.operator]:
              filter.operator === '$isnull' || filter.operator === '$notnull'
                ? true
                : filter.value,
          },
        }
      : {};
  }

  private getParamNames(
    type: keyof NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >,
  ): string[] {
    return this._paramNames.filter((p) => {
      const name = this._options.paramNamesMap[type];
      return isString(name)
        ? name === p
        : (name as string[]).some((m) => m === p);
    });
  }

  private getParamValues<
    U extends keyof NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >,
    R extends CrudRequestParsedParamsInterface<Entity>[U],
  >(
    value: string | string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parser: any,
  ): R[] {
    if (typeof value === 'string' && isStringFull(value)) {
      return [parser.call(this, value)];
    }

    if (Array.isArray(value) && value.length) {
      return (value as string[]).map((val) => parser(val));
    }

    return [];
  }

  private getFilterParamValues(
    value: NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >['filter'],
  ): QueryFilter<Entity>[] {
    const parser = this.conditionParser.bind(this, 'filter');

    if (typeof value === 'string' && isStringFull(value)) {
      return [parser.call(this, value)];
    }

    if (Array.isArray(value) && value.length) {
      return (value as string[]).map((val) => parser(val));
    }

    return [];
  }

  private getOrParamValues(
    value: NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >['or'],
  ): QueryFilter<Entity>[] {
    const parser = this.conditionParser.bind(this, 'or');

    if (typeof value === 'string' && isStringFull(value)) {
      return [parser.call(this, value)];
    }

    if (Array.isArray(value) && value.length) {
      return (value as string[]).map((val) => parser(val));
    }

    return [];
  }

  private getSortParamValues(
    value: NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >['sort'],
  ): QuerySort<Entity>[] {
    const parser = this.sortParser.bind(this);

    if (typeof value === 'string' && isStringFull(value)) {
      return [parser.call(this, value)];
    }

    if (Array.isArray(value) && value.length) {
      return (value as string[]).map((val) => parser(val));
    }

    return [];
  }

  private parseQueryParam<
    U extends keyof NonNullable<
      CrudRequestQueryBuilderOptionsInterface['paramNamesMap']
    >,
    R extends CrudRequestParsedParamsInterface<Entity>[U],
  >(
    type: U,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parser: any,
  ): R[] {
    const param = this.getParamNames(type);

    if (Array.isArray(param) && param.length) {
      return param.reduce(
        (a: R[], name) => [
          ...a,
          ...this.getParamValues<U, R>(this._query[name], parser),
        ],
        [],
      );
    }

    return [];
  }

  private parseFilterQueryParam(): QueryFilter<Entity>[] {
    const param = this.getParamNames('filter');

    if (Array.isArray(param) && param.length) {
      return param.reduce(
        (a: QueryFilter<Entity>[], name) => [
          ...a,
          ...this.getFilterParamValues(this._query[name]),
        ],
        [],
      );
    }

    return [];
  }

  private parseOrQueryParam(): QueryFilter<Entity>[] {
    const param = this.getParamNames('or');

    if (Array.isArray(param) && param.length) {
      return param.reduce(
        (a: QueryFilter<Entity>[], name) => [
          ...a,
          ...this.getOrParamValues(this._query[name]),
        ],
        [],
      );
    }

    return [];
  }

  private parseSortQueryParam(): QuerySort<Entity>[] {
    const param = this.getParamNames('sort');

    if (Array.isArray(param) && param.length) {
      return param.reduce(
        (a: QuerySort<Entity>[], name) => [
          ...a,
          ...this.getSortParamValues(this._query[name]),
        ],
        [],
      );
    }

    return [];
  }

  private parseValue(val: string) {
    try {
      const parsed = JSON.parse(val);

      if (parsed instanceof Date === false && isObject(parsed)) {
        // throw new Error('Don\'t support object now');
        return val;
      } else if (
        typeof parsed === 'number' &&
        parsed.toLocaleString('fullwide', { useGrouping: false }) !== val
      ) {
        // JS cannot handle big numbers. Leave it as a string to prevent data loss
        return val;
      }

      return parsed;
    } catch (ignored) {
      if (isDateString(val)) {
        return new Date(val);
      }

      return val;
    }
  }

  private parseValues(vals: string | string[]) {
    if (Array.isArray(vals)) {
      return vals.map((v: string) => this.parseValue(v));
    } else {
      return this.parseValue(vals);
    }
  }

  private fieldsParser(data: string): QueryFields<Entity> {
    return data.split(this._options.delimStr);
  }

  private parseSearchQueryParam(d: string): SCondition<Entity> | undefined {
    try {
      if (isNil(d)) {
        return undefined;
      }

      const data = JSON.parse(d);

      if (!isObject(data)) {
        throw new Error();
      }

      return data;
    } catch (_) {
      throw new CrudRequestQueryException({
        message: 'Invalid search param. JSON expected',
      });
    }
  }

  private conditionParser(
    cond: 'filter' | 'or' | 'search',
    data: string,
  ): QueryFilter<Entity> {
    const isArrayValue = [
      'in',
      'notin',
      'between',
      '$in',
      '$notin',
      '$between',
      '$inL',
      '$notinL',
    ];
    const isEmptyValue = ['isnull', 'notnull', '$isnull', '$notnull'];
    const param = data.split(this._options.delim);
    const field = param[0];
    const operator = param[1] as ComparisonOperator;
    let value: string | string[] = param[2] || '';

    if (isArrayValue.some((name) => name === operator)) {
      value = value.split(this._options.delimStr);
    }

    value = this.parseValues(value);

    if (!isEmptyValue.some((name) => name === operator) && !hasValue(value)) {
      throw new CrudRequestQueryException({ message: `Invalid ${cond} value` });
    }

    const condition: QueryFilter<Entity> = { field, operator, value };
    validateCondition(condition, cond);

    return condition;
  }

  private sortParser(data: string): QuerySort<Entity> {
    const sort = splitSortString(data, this._options.delimStr);
    validateSort(sort);
    return sort as QuerySort<Entity>;
  }

  private numericParser(
    num: 'limit' | 'offset' | 'page' | 'cache' | 'includeDeleted',
    data: string,
  ): number {
    const val = this.parseValue(data);
    validateNumeric(val, num);

    return val;
  }

  private paramParser(name: string): QueryFilter<Entity> | undefined {
    const paramsOptions: CrudRequestParamsOptionsInterface<Entity> =
      this._paramsOptions ?? {};

    validateParamOption(paramsOptions, name);
    const option = paramsOptions[name];

    if (
      'field' in option &&
      typeof option.field === 'string' &&
      option.disabled !== true
    ) {
      let value = this._params[name];

      switch (option.type) {
        case 'number':
          value = this.parseValue(value);
          validateNumeric(value, `param ${name}`);
          break;
        case 'uuid':
          validateUUID(value, name);
          break;
        default:
          break;
      }

      return { field: option.field, operator: '$eq', value };
    } else {
      return undefined;
    }
  }
}

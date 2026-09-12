import * as swagger from '@nestjs/swagger';

import { Operation } from '@concepta/nestjs-core';

import { CrudQueryBuilder } from '../request/crud-query.builder.js';

export { swagger };

export class Swagger {
  static createQueryParamsMeta(operation: Operation.List | Operation.Read) {
    /* istanbul ignore if */
    if (!swagger) {
      return [];
    }

    const {
      fields,
      search,
      filter,
      or,
      sort,
      limit,
      offset,
      page,
      cache,
      includeDeleted,
    } = Swagger.getQueryParamsNames();
    const docsLink = `<a href="https://www.npmjs.com/package/@concepta/nestjs-crud#query-string-parameters" target="_blank">Docs</a>`;

    const fieldsMeta = {
      name: fields,
      description: `Selects resource fields. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'array', items: { type: 'string' } },
      style: 'form',
      explode: false,
    };

    const searchMeta = {
      name: search,
      description: `Adds search condition. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'string' },
    };

    const filterMeta = {
      name: filter,
      description: `Adds filter condition. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'array', items: { type: 'string' } },
      style: 'form',
      explode: true,
    };

    const orMeta = {
      name: or,
      description: `Adds OR condition. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'array', items: { type: 'string' } },
      style: 'form',
      explode: true,
    };

    const sortMeta = {
      name: sort,
      description: `Adds sort by field. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'array', items: { type: 'string' } },
      style: 'form',
      explode: true,
    };

    const limitMeta = {
      name: limit,
      description: `Limit amount of resources. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'integer' },
    };

    const offsetMeta = {
      name: offset,
      description: `Offset amount of resources. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'integer' },
    };

    const pageMeta = {
      name: page,
      description: `Page portion of resources. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'integer' },
    };

    const cacheMeta = {
      name: cache,
      description: `Reset cache (if was enabled). ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'integer', minimum: 0, maximum: 1 },
    };

    const includeDeletedMeta = {
      name: includeDeleted,
      description: `Include deleted. ${docsLink}`,
      required: false,
      in: 'query',
      schema: { type: 'integer', minimum: 0, maximum: 1 },
    };

    switch (operation) {
      case Operation.List:
        return [
          fieldsMeta,
          searchMeta,
          filterMeta,
          orMeta,
          sortMeta,
          limitMeta,
          offsetMeta,
          pageMeta,
          cacheMeta,
          includeDeletedMeta,
        ];
      case Operation.Read:
        return [fieldsMeta, cacheMeta, includeDeletedMeta];
      default:
        return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getQueryParamsNames(): any {
    const qbOptions = CrudQueryBuilder.getOptions();
    const name = (n: string) => {
      if (qbOptions?.paramNamesMap) {
        return qbOptions.paramNamesMap[n][0];
      } else {
        return;
      }
    };

    return {
      delim: qbOptions.delim,
      delimStr: qbOptions.delimStr,
      fields: name('fields'),
      search: name('search'),
      filter: name('filter'),
      or: name('or'),
      sort: name('sort'),
      limit: name('limit'),
      offset: name('offset'),
      page: name('page'),
      cache: name('cache'),
      includeDeleted: name('includeDeleted'),
    };
  }
}

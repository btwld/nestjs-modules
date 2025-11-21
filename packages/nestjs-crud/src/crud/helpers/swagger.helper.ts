import { PlainLiteralObject } from '@nestjs/common';
import { isString } from '@nestjs/common/utils/shared.utils';

import { CrudRequestQueryBuilder } from '../../request/crud-request-query.builder';
import { CrudOptionsInterface } from '../interfaces/crud-options.interface';
import { CrudRouteName } from '../types/crud-route-name.type';
import { safeRequire } from '../util';

export const swagger = safeRequire('@nestjs/swagger', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@nestjs/swagger'),
);
export const swaggerConst = safeRequire('@nestjs/swagger/dist/constants', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@nestjs/swagger/dist/constants'),
);
export const swaggerPkgJson = safeRequire('@nestjs/swagger/package.json', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@nestjs/swagger/package.json'),
);

export class Swagger {
  static createQueryParamsMeta<T extends PlainLiteralObject>(
    name: CrudRouteName,
    options: CrudOptionsInterface<T>,
  ) {
    /* istanbul ignore if */
    if (!swaggerConst) {
      return [];
    }

    const {
      fields,
      search,
      filter,
      or,
      join,
      sort,
      limit,
      offset,
      page,
      cache,
      includeDeleted,
    } = Swagger.getQueryParamsNames();
    const oldVersion = Swagger.getSwaggerVersion() < 4;
    const docsLink = (a: string) =>
      `<a href="https://github.com/nestjsx/crud/wiki/Requests#${a}" target="_blank">Docs</a>`;

    const fieldsMetaBase = {
      name: fields,
      description: `Selects resource fields. ${docsLink('select')}`,
      required: false,
      in: 'query',
    };
    const fieldsMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...fieldsMetaBase,
          type: 'array',
          items: {
            type: 'string',
          },
          collectionFormat: 'csv',
        }
      : {
          ...fieldsMetaBase,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          style: 'form',
          explode: false,
        };

    const searchMetaBase = {
      name: search,
      description: `Adds search condition. ${docsLink('search')}`,
      required: false,
      in: 'query',
    };
    const searchMeta = oldVersion
      ? /* istanbul ignore next */ { ...searchMetaBase, type: 'string' }
      : { ...searchMetaBase, schema: { type: 'string' } };

    const filterMetaBase = {
      name: filter,
      description: `Adds filter condition. ${docsLink('filter')}`,
      required: false,
      in: 'query',
    };
    const filterMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...filterMetaBase,
          items: {
            type: 'string',
          },
          type: 'array',
          collectionFormat: 'multi',
        }
      : {
          ...filterMetaBase,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          style: 'form',
          explode: true,
        };

    const orMetaBase = {
      name: or,
      description: `Adds OR condition. ${docsLink('or')}`,
      required: false,
      in: 'query',
    };
    const orMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...orMetaBase,
          items: {
            type: 'string',
          },
          type: 'array',
          collectionFormat: 'multi',
        }
      : {
          ...orMetaBase,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          style: 'form',
          explode: true,
        };

    const sortMetaBase = {
      name: sort,
      description: `Adds sort by field. ${docsLink('sort')}`,
      required: false,
      in: 'query',
    };
    const sortMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...sortMetaBase,
          items: {
            type: 'string',
          },
          type: 'array',
          collectionFormat: 'multi',
        }
      : {
          ...sortMetaBase,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          style: 'form',
          explode: true,
        };

    const joinMetaBase = {
      name: join,
      description: `Adds relational resources. ${docsLink('join')}`,
      required: false,
      in: 'query',
    };
    const joinMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...joinMetaBase,
          items: {
            type: 'string',
          },
          type: 'array',
          collectionFormat: 'multi',
        }
      : {
          ...joinMetaBase,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          style: 'form',
          explode: true,
        };

    const limitMetaBase = {
      name: limit,
      description: `Limit amount of resources. ${docsLink('limit')}`,
      required: false,
      in: 'query',
    };
    const limitMeta = oldVersion
      ? /* istanbul ignore next */ { ...limitMetaBase, type: 'integer' }
      : { ...limitMetaBase, schema: { type: 'integer' } };

    const offsetMetaBase = {
      name: offset,
      description: `Offset amount of resources. ${docsLink('offset')}`,
      required: false,
      in: 'query',
    };
    const offsetMeta = oldVersion
      ? /* istanbul ignore next */ { ...offsetMetaBase, type: 'integer' }
      : { ...offsetMetaBase, schema: { type: 'integer' } };

    const pageMetaBase = {
      name: page,
      description: `Page portion of resources. ${docsLink('page')}`,
      required: false,
      in: 'query',
    };
    const pageMeta = oldVersion
      ? /* istanbul ignore next */ { ...pageMetaBase, type: 'integer' }
      : { ...pageMetaBase, schema: { type: 'integer' } };

    const cacheMetaBase = {
      name: cache,
      description: `Reset cache (if was enabled). ${docsLink('cache')}`,
      required: false,
      in: 'query',
    };
    const cacheMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...cacheMetaBase,
          type: 'integer',
          minimum: 0,
          maximum: 1,
        }
      : {
          ...cacheMetaBase,
          schema: { type: 'integer', minimum: 0, maximum: 1 },
        };

    const includeDeletedMetaBase = {
      name: includeDeleted,
      description: `Include deleted. ${docsLink('includeDeleted')}`,
      required: false,
      in: 'query',
    };
    const includeDeletedMeta = oldVersion
      ? /* istanbul ignore next */ {
          ...includeDeletedMetaBase,
          type: 'integer',
          minimum: 0,
          maximum: 1,
        }
      : {
          ...includeDeletedMetaBase,
          schema: { type: 'integer', minimum: 0, maximum: 1 },
        };

    switch (name) {
      case 'getMany':
        return options.query?.softDelete
          ? [
              fieldsMeta,
              searchMeta,
              filterMeta,
              orMeta,
              sortMeta,
              joinMeta,
              limitMeta,
              offsetMeta,
              pageMeta,
              cacheMeta,
              includeDeletedMeta,
            ]
          : [
              fieldsMeta,
              searchMeta,
              filterMeta,
              orMeta,
              sortMeta,
              joinMeta,
              limitMeta,
              offsetMeta,
              pageMeta,
              cacheMeta,
            ];
      case 'getOne':
        return options.query?.softDelete
          ? [fieldsMeta, joinMeta, cacheMeta, includeDeletedMeta]
          : [fieldsMeta, joinMeta, cacheMeta];
      default:
        return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getQueryParamsNames(): any {
    const qbOptions = CrudRequestQueryBuilder.getOptions();
    const name = (n: string) => {
      if (qbOptions?.paramNamesMap) {
        const selected = qbOptions?.paramNamesMap[n];
        return isString(selected) ? selected : selected[0];
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

  private static getSwaggerVersion(): number {
    return swaggerPkgJson
      ? parseInt(swaggerPkgJson.version[0], 10)
      : /* istanbul ignore next */ 3;
  }
}

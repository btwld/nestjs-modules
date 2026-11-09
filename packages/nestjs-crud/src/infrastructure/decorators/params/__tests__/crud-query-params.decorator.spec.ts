import { mock } from 'vitest-mock-extended';

import { type ArgumentsHost, type ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { mockCrudParsedQuery } from '../../../../__fixtures__/crud/mocks/crud-parsed-query.mock.js';
import { CrudQueryValidatorException } from '../../../request/exceptions/crud-query-validator.exception.js';
import { CrudQueryParams } from '../crud-query-params.decorator.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;
type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

const getDecoratorFactory = (): ParamFactory => {
  class Probe {
    test(@CrudQueryParams() _query: unknown): void {
      return;
    }
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    'test',
  ) as Record<string, { factory: ParamFactory }>;
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
};

const buildExecutionContext = (query: object): ExecutionContext => {
  const httpArgsHost = mock<HttpArgumentsHost>();
  httpArgsHost.getRequest.mockReturnValue({ query });
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue(httpArgsHost);
  return ctx;
};

describe('CrudQueryParams', () => {
  it('should return an empty parsed query when the request has no query string', () => {
    const factory = getDecoratorFactory();

    const result = factory(undefined, buildExecutionContext({}));

    expect(result).toEqual(mockCrudParsedQuery());
  });

  it('should parse filter, sort, and pagination from the raw query string', () => {
    const factory = getDecoratorFactory();
    const query = {
      filter: 'firstName||$eq||John',
      sort: 'lastName,DESC',
      limit: '10',
      page: '2',
    };

    const result = factory(undefined, buildExecutionContext(query));

    expect(result).toEqual(
      mockCrudParsedQuery({
        filter: [{ field: 'firstName', operator: 'eq', value: 'John' }],
        sort: [{ field: 'lastName', order: 'DESC' }],
        limit: 10,
        page: 2,
      }),
    );
  });

  it('should throw CrudQueryValidatorException for a malformed filter operator', () => {
    const factory = getDecoratorFactory();
    const query = { filter: 'firstName||badop||John' };

    expect(() => factory(undefined, buildExecutionContext(query))).toThrow(
      CrudQueryValidatorException,
    );
  });
});

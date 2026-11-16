import { type CrudParamsOptionsInterface } from '../../interfaces/crud-params-options.interface.js';
import { CrudQueryParser } from '../crud-query.parser.js';
import { CrudQueryParserException } from '../exceptions/crud-query-parser.exception.js';
import { CrudQueryValidatorException } from '../exceptions/crud-query-validator.exception.js';
import { type CrudParsedQueryInterface } from '../interfaces/crud-parsed-query.interface.js';

class TestEntity {
  foo!: unknown;
  bar!: unknown;
  baz!: unknown;
  bigInt!: number;
  name!: unknown;
}

const EMPTY_PARSED: CrudParsedQueryInterface<TestEntity> = {
  fields: [],
  search: undefined,
  filter: [],
  or: [],
  sort: [],
  limit: undefined,
  offset: undefined,
  page: undefined,
  cache: undefined,
  includeDeleted: undefined,
};

describe('#request-query', () => {
  describe('CrudQueryParser', () => {
    let qp: CrudQueryParser<TestEntity>;

    beforeEach(() => {
      qp = CrudQueryParser.create();
    });

    describe('#parseQuery', () => {
      it('should return instance of CrudQueryParser', () => {
        expect(qp.parseQuery({})).toBeInstanceOf(CrudQueryParser);
      });

      describe('#parse fields', () => {
        it('should set empty array, 1', () => {
          const test = qp.parseQuery({ select: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set empty array, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set array, 1', () => {
          const test = qp.parseQuery({ select: 'foo' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            fields: ['foo'],
          });
        });
        it('should set array, 2', () => {
          const test = qp.parseQuery({ select: 'foo,bar' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            fields: ['foo', 'bar'],
          });
        });
      });

      describe('#parse filter', () => {
        it('should set empty array, 1', () => {
          const test = qp.parseQuery({ filter: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set empty array, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error, 1', () => {
          expect(
            qp.parseQuery.bind(qp, { filter: 'foo||$invalid||bar' }),
          ).toThrow(CrudQueryValidatorException);
        });
        it('should throw an error, 2', () => {
          expect(qp.parseQuery.bind(qp, { filter: 'foo||$eq' })).toThrow(
            CrudQueryParserException,
          );
        });
        it('should set array, 1', () => {
          const test = qp.parseQuery({ filter: 'foo||$eq||bar' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 2', () => {
          const test = qp.parseQuery({
            filter: ['foo||$eq||bar', 'baz||$ne||boo'],
          });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: 'bar',
                relation: undefined,
              },
              {
                field: 'baz',
                operator: 'ne',
                value: 'boo',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 3', () => {
          const test = qp.parseQuery({ filter: ['foo||$in||1,2'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'in',
                value: [1, 2],
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 4', () => {
          const test = qp.parseQuery({ filter: ['foo||$null'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'null',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 5', () => {
          const test = qp.parseQuery({ filter: ['foo||$eq||{"foo":true}'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: '{"foo":true}',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 6', () => {
          const test = qp.parseQuery({ filter: ['foo||$eq||1'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              { field: 'foo', operator: 'eq', value: 1, relation: undefined },
            ],
          });
        });
        it('should set date, 7', () => {
          const now = new Date();
          const test = qp.parseQuery({ filter: [`foo||$eq||${now.toJSON()}`] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: now,
                relation: undefined,
              },
            ],
          });
        });
        it('should set false, 8', () => {
          const test = qp.parseQuery({ filter: ['foo||$eq||false'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: false,
                relation: undefined,
              },
            ],
          });
        });
        it('should set true, 9', () => {
          const test = qp.parseQuery({ filter: ['foo||$eq||true'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: true,
                relation: undefined,
              },
            ],
          });
        });
        it('should set number, 10', () => {
          const test = qp.parseQuery({ filter: ['foo||$eq||12345'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: 12345,
                relation: undefined,
              },
            ],
          });
        });
        it('should set string, 11', () => {
          const test = qp.parseQuery({
            filter: ['foo||$eq||4202140192612927005304000000236630'],
          });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'eq',
                value: '4202140192612927005304000000236630',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $nnull operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$nnull'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'nnull',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $nin operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$nin||1,2,3'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'nin',
                value: [1, 2, 3],
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $between operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$between||1,10'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'between',
                value: [1, 10],
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $gt operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$gt||5'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              { field: 'foo', operator: 'gt', value: 5, relation: undefined },
            ],
          });
        });
        it('should parse $lt operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$lt||5'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              { field: 'foo', operator: 'lt', value: 5, relation: undefined },
            ],
          });
        });
        it('should parse $gte operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$gte||5'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              { field: 'foo', operator: 'gte', value: 5, relation: undefined },
            ],
          });
        });
        it('should parse $lte operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$lte||5'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              { field: 'foo', operator: 'lte', value: 5, relation: undefined },
            ],
          });
        });
        it('should parse $starts operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$starts||bar'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'starts',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $ends operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$ends||bar'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'ends',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $contains operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$contains||bar'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'contains',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $ncontains operator', () => {
          const test = qp.parseQuery({ filter: ['foo||$ncontains||bar'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'ncontains',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $in with string values', () => {
          const test = qp.parseQuery({ filter: ['foo||$in||abc,def'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'foo',
                operator: 'in',
                value: ['abc', 'def'],
                relation: undefined,
              },
            ],
          });
        });
        it('should parse relation dotted field', () => {
          const test = qp.parseQuery({ filter: ['bar.name||$eq||test'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            filter: [
              {
                field: 'name',
                operator: 'eq',
                value: 'test',
                relation: 'bar',
              },
            ],
          });
        });
      });

      describe('#parse or', () => {
        it('should set empty array, 1', () => {
          const test = qp.parseQuery({ or: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set empty array, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error, 1', () => {
          expect(qp.parseQuery.bind(qp, { or: 'foo||$invalid||bar' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should throw an error, 2', () => {
          expect(qp.parseQuery.bind(qp, { or: 'foo||$eq' })).toThrow(
            CrudQueryParserException,
          );
        });
        it('should set array, 1', () => {
          const test = qp.parseQuery({ or: 'foo||$eq||bar' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'foo',
                operator: 'eq',
                value: 'bar',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 2', () => {
          const test = qp.parseQuery({
            or: ['foo||$eq||bar', 'baz||$ne||boo'],
          });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'foo',
                operator: 'eq',
                value: 'bar',
                relation: undefined,
              },
              {
                field: 'baz',
                operator: 'ne',
                value: 'boo',
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 3', () => {
          const test = qp.parseQuery({ or: ['foo||$in||1,2'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'foo',
                operator: 'in',
                value: [1, 2],
                relation: undefined,
              },
            ],
          });
        });
        it('should set array, 4', () => {
          const test = qp.parseQuery({ or: ['foo||$null'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'foo',
                operator: 'null',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse $nnull operator', () => {
          const test = qp.parseQuery({ or: ['foo||$nnull'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'foo',
                operator: 'nnull',
                relation: undefined,
              },
            ],
          });
        });
        it('should parse relation dotted field', () => {
          const test = qp.parseQuery({ or: ['bar.name||$eq||test'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            or: [
              {
                field: 'name',
                operator: 'eq',
                value: 'test',
                relation: 'bar',
              },
            ],
          });
        });
      });

      describe('#parse sort', () => {
        it('should set empty array, 1', () => {
          const test = qp.parseQuery({ sort: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set empty array, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error, 1', () => {
          expect(qp.parseQuery.bind(qp, { sort: 'foo' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should throw an error, 2', () => {
          expect(qp.parseQuery.bind(qp, { sort: 'foo,boo' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set array', () => {
          const test = qp.parseQuery({ sort: ['foo,ASC', 'bar,DESC'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            sort: [
              { field: 'foo', order: 'ASC', relation: undefined },
              { field: 'bar', order: 'DESC', relation: undefined },
            ],
          });
        });
        it('should parse single string sort', () => {
          const test = qp.parseQuery({ sort: 'foo,ASC' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            sort: [{ field: 'foo', order: 'ASC', relation: undefined }],
          });
        });
        it('should parse relation dotted sort', () => {
          const test = qp.parseQuery({ sort: ['bar.name,DESC'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            sort: [{ field: 'name', order: 'DESC', relation: 'bar' }],
          });
        });
      });

      describe('#parse limit', () => {
        it('should set undefined, 1', () => {
          const test = qp.parseQuery({ limit: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set undefined, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error', () => {
          expect(qp.parseQuery.bind(qp, { limit: 'a' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set value', () => {
          const test = qp.parseQuery({ limit: '10' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            limit: 10,
          });
        });
      });

      describe('#parse offset', () => {
        it('should set undefined, 1', () => {
          const test = qp.parseQuery({ offset: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set undefined, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error', () => {
          expect(qp.parseQuery.bind(qp, { offset: 'a' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set value', () => {
          const test = qp.parseQuery({ offset: '10' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            offset: 10,
          });
        });
      });

      describe('#parse page', () => {
        it('should set undefined, 1', () => {
          const test = qp.parseQuery({ page: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set undefined, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error', () => {
          expect(qp.parseQuery.bind(qp, { page: ['a'] })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set value', () => {
          const test = qp.parseQuery({ page: ['10'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            page: 10,
          });
        });
      });

      describe('#parse cache', () => {
        it('should set undefined, 1', () => {
          const test = qp.parseQuery({ cache: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set undefined, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error', () => {
          expect(qp.parseQuery.bind(qp, { cache: ['a'] })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set value', () => {
          const test = qp.parseQuery({ cache: ['10'] });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            cache: 10,
          });
        });
      });

      describe('#parse includeDeleted', () => {
        it('should set undefined, 1', () => {
          const test = qp.parseQuery({ includeDeleted: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should set undefined, 2', () => {
          const test = qp.parseQuery({ foo: '' });
          expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
        });
        it('should throw an error', () => {
          expect(qp.parseQuery.bind(qp, { includeDeleted: 'a' })).toThrow(
            CrudQueryValidatorException,
          );
        });
        it('should set value', () => {
          const test = qp.parseQuery({ includeDeleted: '1' });
          expect(test.getParsedQuery()).toEqual({
            ...EMPTY_PARSED,
            includeDeleted: 1,
          });
        });
      });
    });

    describe('#parse search', () => {
      it('should set undefined', () => {
        const test = qp.parseQuery({ foo: '' });
        expect(test.getParsedQuery()).toEqual(EMPTY_PARSED);
      });
      it('should throw an error, 1', () => {
        expect(qp.parseQuery.bind(qp, { s: 'invalid' })).toThrow(
          CrudQueryParserException,
        );
      });
      it('should throw an error, 2', () => {
        expect(qp.parseQuery.bind(qp, { s: 'true' })).toThrow(
          CrudQueryParserException,
        );
      });
      it('should parse search', () => {
        const test = qp.parseQuery({ s: '{"$or":[{"id":1},{"name":"foo"}]}' });
        expect(test.getParsedQuery()).toEqual({
          ...EMPTY_PARSED,
          search: { $or: [{ id: 1 }, { name: 'foo' }] },
        });
      });
      it('should suppress filter and or when search is present', () => {
        const test = qp.parseQuery({
          s: '{"$or":[{"id":1}]}',
          filter: 'foo||$eq||bar',
          or: 'foo||$ne||baz',
        });
        expect(test.getParsedQuery()).toEqual({
          ...EMPTY_PARSED,
          search: { $or: [{ id: 1 }] },
        });
      });
    });

    describe('#parseParams', () => {
      it('should return instance of CrudQueryParser', () => {
        expect(qp.parseParams({}, {})).toBeInstanceOf(CrudQueryParser);
      });
      it('should throw an error, 1', () => {
        const params = { foo: 'bar' };
        const options: CrudParamsOptionsInterface<TestEntity> = {};
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 2', () => {
        const params = { foo: 'bar' };
        const options = {};
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 3', () => {
        const params = { foo: 'bar' };
        const options = { foo: {} };
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 4', () => {
        const params = { foo: 'bar' };
        const options = {
          foo: { field: 'number' },
        } as unknown as CrudParamsOptionsInterface<TestEntity>;
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 5', () => {
        const params = { foo: 'bar' };
        const options: CrudParamsOptionsInterface<TestEntity> = {
          foo: { field: 'foo', type: 'number' },
        };
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 6', () => {
        const params = { foo: 'bar' };
        const options: CrudParamsOptionsInterface<TestEntity> = {
          foo: { field: 'foo', type: 'uuid' },
        };
        expect(qp.parseParams.bind(qp, params, options)).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set routeParams', () => {
        const params = {
          foo: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d',
          bar: '1',
          baz: 'string',
          bigInt: '9007199254740999',
        };
        const options: CrudParamsOptionsInterface<TestEntity> = {
          foo: { field: 'foo', type: 'uuid' },
          bar: { field: 'bar', type: 'number' },
          baz: { field: 'baz', type: 'string' },
          bigInt: { field: 'bigInt', type: 'string' },
        };
        const test = qp.parseParams(params, options);
        expect(test.getRouteParams()).toEqual({
          foo: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d',
          bar: 1,
          baz: 'string',
          bigInt: '9007199254740999',
        });
      });
      it('should set routeParams with disabled validation', () => {
        const params = {
          foo: 'cb1751fd',
          bar: '123',
        };
        const options: CrudParamsOptionsInterface<TestEntity> = {
          foo: { disabled: true },
          bar: { field: 'bar', type: 'number' },
        };
        const test = qp.parseParams(params, options);
        expect(test.getRouteParams()).toEqual({ bar: 123 });
      });
    });

    describe('#getParsedQuery', () => {
      it('should return parsed query params', () => {
        expect(qp.getParsedQuery()).toEqual(EMPTY_PARSED);
      });
      it('should return populated state after parseQuery', () => {
        qp.parseQuery({
          select: 'foo,bar',
          filter: 'foo||$eq||1',
          or: 'bar||$ne||2',
          sort: 'foo,ASC',
          limit: '10',
          offset: '5',
          page: '2',
          cache: '60',
          includeDeleted: '1',
        });
        expect(qp.getParsedQuery()).toEqual({
          fields: ['foo', 'bar'],
          search: undefined,
          filter: [
            { field: 'foo', operator: 'eq', value: 1, relation: undefined },
          ],
          or: [{ field: 'bar', operator: 'ne', value: 2, relation: undefined }],
          sort: [{ field: 'foo', order: 'ASC', relation: undefined }],
          limit: 10,
          offset: 5,
          page: 2,
          cache: 60,
          includeDeleted: 1,
        });
      });
    });

    describe('#getRouteParams', () => {
      it('should return empty object by default', () => {
        expect(qp.getRouteParams()).toEqual({});
      });
      it('should return populated params after parseParams', () => {
        const params = {
          foo: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d',
          bar: '42',
        };
        const options: CrudParamsOptionsInterface<TestEntity> = {
          foo: { field: 'foo', type: 'uuid' },
          bar: { field: 'bar', type: 'number' },
        };
        qp.parseParams(params, options);
        expect(qp.getRouteParams()).toEqual({
          foo: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d',
          bar: 42,
        });
      });
    });

    describe('#parseQuery edge cases', () => {
      it('should return self when given non-object input', () => {
        const result = qp.parseQuery(
          null as unknown as Record<string, unknown>,
        );
        expect(result).toBeInstanceOf(CrudQueryParser);
        expect(result.getParsedQuery()).toEqual(EMPTY_PARSED);
      });
      it('should keep defaults when given empty object', () => {
        const result = qp.parseQuery({});
        expect(result.getParsedQuery()).toEqual(EMPTY_PARSED);
      });
      it('should parse array-indexed filter param names', () => {
        const test = qp.parseQuery({
          'filter[0]': 'foo||$eq||bar',
          'filter[1]': 'baz||$ne||boo',
        });
        expect(test.getParsedQuery()).toEqual({
          ...EMPTY_PARSED,
          filter: [
            {
              field: 'foo',
              operator: 'eq',
              value: 'bar',
              relation: undefined,
            },
            {
              field: 'baz',
              operator: 'ne',
              value: 'boo',
              relation: undefined,
            },
          ],
        });
      });
    });

    describe('#parseParams edge cases', () => {
      it('should return self when given non-object input', () => {
        const result = qp.parseParams(
          null as unknown as Record<string, unknown>,
          {},
        );
        expect(result).toBeInstanceOf(CrudQueryParser);
        expect(result.getRouteParams()).toEqual({});
      });
    });

    describe('#parseQuery + parseParams chaining', () => {
      it('should compose query and route params on the same instance', () => {
        qp.parseQuery({
          filter: 'foo||$eq||bar',
          limit: '10',
        });
        qp.parseParams({ id: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d' }, {
          id: { field: 'foo', type: 'uuid' },
        } as CrudParamsOptionsInterface<TestEntity>);
        expect(qp.getParsedQuery()).toEqual({
          ...EMPTY_PARSED,
          filter: [
            {
              field: 'foo',
              operator: 'eq',
              value: 'bar',
              relation: undefined,
            },
          ],
          limit: 10,
        });
        expect(qp.getRouteParams()).toEqual({
          foo: 'cb1751fd-7fcf-4eb5-b38e-86428b1fd88d',
        });
      });
    });
  });
});

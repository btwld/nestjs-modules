/* eslint-disable @typescript-eslint/no-explicit-any */
import { CrudQueryBuilder } from '../crud-query.builder.js';
import { CrudQueryValidatorException } from '../exceptions/crud-query-validator.exception.js';
import { type CrudQueryBuilderOptionsInterface } from '../interfaces/crud-query-builder-options.interface.js';

const defaultOptions = { ...(CrudQueryBuilder as any)._options };

describe('#query', () => {
  describe('#QueryBuilder', () => {
    let qb: CrudQueryBuilder;

    beforeEach(() => {
      qb = CrudQueryBuilder.create();
    });

    afterEach(() => {
      (CrudQueryBuilder as any)._options = defaultOptions;
    });

    it('should be a function', () => {
      expect(typeof CrudQueryBuilder).toEqual('function');
    });

    describe('#static setOptions', () => {
      it('should merge options, 1', () => {
        const options: CrudQueryBuilderOptionsInterface = {
          paramNamesMap: { fields: ['override'] },
        };
        CrudQueryBuilder.setOptions(options);
        expect((CrudQueryBuilder as any)._options).toEqual({
          delim: '||',
          delimStr: ',',
          paramNamesMap: {
            fields: ['override'],
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
        });
      });
      it('should merge options, 2', () => {
        CrudQueryBuilder.setOptions({ delim: 'override' });
        expect((CrudQueryBuilder as any)._options).toEqual({
          delim: 'override',
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
        });
      });
    });

    describe('#select', () => {
      it('should not throw', () => {
        (qb as any).select();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error', () => {
        expect((qb.select as any).bind(qb, [false])).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set fields', () => {
        qb.select(['foo', 'bar']);
        expect(qb.queryObject).toEqual({ select: 'foo,bar' });
      });
    });

    describe('#setFilter', () => {
      it('should not throw', () => {
        (qb as any).setFilter();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error, 1', () => {
        expect((qb.setFilter as any).bind(qb, { field: 1 })).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 2', () => {
        expect(
          (qb.setFilter as any).bind(qb, { field: 'foo', operator: 'bar' }),
        ).toThrow(CrudQueryValidatorException);
      });
      it('should throw an error, 3', () => {
        expect((qb.setFilter as any).bind(qb, [{}])).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set filter, 1', () => {
        qb.setFilter({ field: 'foo', operator: 'eq', value: 'bar' });
        expect(qb.queryObject).toEqual({ filter: ['foo||$eq||bar'] });
      });
      it('should set filter, 2', () => {
        qb.setFilter([
          { field: 'foo', operator: 'eq', value: 'bar' },
          { field: 'baz', operator: 'ne', value: 'zoo' },
        ]);
        expect(qb.queryObject).toEqual({
          filter: ['foo||$eq||bar', 'baz||$ne||zoo'],
        });
      });
      it('should set filter, 3', () => {
        qb.setFilter([
          ['foo', 'eq', 'bar'],
          { field: 'baz', operator: 'ne', value: 'zoo' },
        ]);
        expect(qb.queryObject).toEqual({
          filter: ['foo||$eq||bar', 'baz||$ne||zoo'],
        });
      });
      it('should set filter, 4', () => {
        qb.setFilter([
          ['foo', 'eq', 'bar'],
          ['baz', 'ne', 'zoo'],
        ]);
        expect(qb.queryObject).toEqual({
          filter: ['foo||$eq||bar', 'baz||$ne||zoo'],
        });
      });
      it('should set filter, 5', () => {
        qb.setFilter(['foo', 'eq', 'bar']);
        expect(qb.queryObject).toEqual({ filter: ['foo||$eq||bar'] });
      });
    });

    describe('#setOr', () => {
      it('should not throw', () => {
        (qb as any).setOr();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error, 1', () => {
        expect((qb.setOr as any).bind(qb, { field: 1 })).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 2', () => {
        expect(
          (qb.setOr as any).bind(qb, { field: 'foo', operator: 'bar' }),
        ).toThrow(CrudQueryValidatorException);
      });
      it('should throw an error, 3', () => {
        expect((qb.setOr as any).bind(qb, [{}])).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set or, 1', () => {
        qb.setOr({ field: 'foo', operator: 'eq', value: 'bar' });
        expect(qb.queryObject).toEqual({ or: ['foo||$eq||bar'] });
      });
      it('should set or, 2', () => {
        qb.setOr([
          { field: 'foo', operator: 'eq', value: 'bar' },
          { field: 'baz', operator: 'ne', value: 'zoo' },
        ]);
        expect(qb.queryObject).toEqual({
          or: ['foo||$eq||bar', 'baz||$ne||zoo'],
        });
      });
    });

    describe('#sortBy', () => {
      it('should not throw', () => {
        (qb as any).sortBy();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error, 1', () => {
        expect((qb.sortBy as any).bind(qb, { field: 1 })).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should throw an error, 2', () => {
        expect(
          (qb.sortBy as any).bind(qb, { field: 'foo', order: 'bar' }),
        ).toThrow(CrudQueryValidatorException);
      });
      it('should throw an error, 3', () => {
        expect((qb.sortBy as any).bind(qb, [{}])).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set sort, 1', () => {
        qb.sortBy({ field: 'foo', order: 'ASC' });
        expect(qb.queryObject).toEqual({ sort: ['foo,ASC'] });
      });
      it('should set sort, 2', () => {
        qb.sortBy([
          { field: 'foo', order: 'ASC' },
          { field: 'bar', order: 'DESC' },
        ]);
        expect(qb.queryObject).toEqual({ sort: ['foo,ASC', 'bar,DESC'] });
      });
      it('should set sort, 3', () => {
        qb.sortBy(['foo', 'ASC']);
        expect(qb.queryObject).toEqual({ sort: ['foo,ASC'] });
      });
      it('should set sort, 4', () => {
        qb.sortBy([['foo', 'ASC']]);
        expect(qb.queryObject).toEqual({ sort: ['foo,ASC'] });
      });
      it('should set sort, 5', () => {
        qb.sortBy([{ field: 'bar', order: 'DESC' }, ['foo', 'ASC']]);
        expect(qb.queryObject).toEqual({ sort: ['bar,DESC', 'foo,ASC'] });
      });
    });

    describe('#setLimit', () => {
      it('should not throw', () => {
        (qb as any).setLimit();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error', () => {
        expect((qb.setLimit as any).bind(qb, {})).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set limit', () => {
        qb.setLimit(10);
        expect(qb.queryObject).toEqual({ limit: 10 });
      });
    });

    describe('#setOffset', () => {
      it('should not throw', () => {
        (qb as any).setOffset();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error', () => {
        expect((qb.setOffset as any).bind(qb, {})).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set offset', () => {
        qb.setOffset(10);
        expect(qb.queryObject).toEqual({ offset: 10 });
      });
    });

    describe('#setPage', () => {
      it('should not throw', () => {
        (qb as any).setPage();
        expect(qb.queryObject).toEqual({});
      });
      it('should throw an error', () => {
        expect((qb.setPage as any).bind(qb, {})).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should set page', () => {
        qb.setPage(10);
        expect(qb.queryObject).toEqual({ page: 10 });
      });
    });

    describe('#resetCache', () => {
      it('should set cache', () => {
        expect(qb.queryObject).toEqual({});
        qb.resetCache();
        expect(qb.queryObject).toEqual({ cache: 0 });
      });
    });

    describe('#cond', () => {
      it('should throw an error, 1', () => {
        expect((qb as any).cond).toThrow(CrudQueryValidatorException);
      });
      it('should throw an error, 2', () => {
        expect((qb as any).cond.bind(qb, {})).toThrow(
          CrudQueryValidatorException,
        );
      });
      it('should return a filter string from an object', () => {
        const test = (qb as any).cond(
          { field: 'foo', operator: 'eq', value: 'bar' },
          'filter',
        );
        expect(test).toEqual('foo||$eq||bar');
      });
      it('should return a filter string from an array', () => {
        const test = (qb as any).cond(['foo', 'eq', 'bar'], 'filter');
        expect(test).toEqual('foo||$eq||bar');
      });
    });

    describe('#query', () => {
      it('should return an empty string', () => {
        expect(qb.query()).toEqual('');
      });
      it('should return query with overrided fields name', () => {
        CrudQueryBuilder.setOptions({
          paramNamesMap: { fields: ['override'] },
        });
        qb.setParamNames();
        expect(qb.select(['foo', 'bar']).query()).toEqual('override=foo%2Cbar');
        expect(qb.select(['foo', 'bar']).query(false)).toEqual(
          'override=foo,bar',
        );
      });
      it('should return valid query string with filters', () => {
        const test = qb
          .select(['foo', 'bar'])
          .setFilter([
            { field: 'is', operator: 'nnull' },
            { field: 'foo', operator: 'lt', value: 10 },
          ])
          .query(false);
        expect(test).toEqual(
          'select=foo,bar&filter[0]=is||$nnull&filter[1]=foo||$lt||10',
        );
      });
      it('should return a valid query string', () => {
        const test = qb
          .select(['foo', 'bar'])
          .setFilter(['is', 'nnull'])
          .setOr({ field: 'ok', operator: 'ne', value: false })
          .setLimit(1)
          .setOffset(2)
          .setPage(3)
          .sortBy({ field: 'foo', order: 'DESC' })
          .resetCache()
          .setIncludeDeleted(1)
          .query(false);
        expect(test).toEqual(
          'select=foo,bar&filter[0]=is||$nnull&or[0]=ok||$ne||false&limit=1&offset=2&page=3&sort[0]=foo,DESC&cache=0&includeDeleted=1',
        );
      });
    });

    describe('#search', () => {
      it('should not throw, 1', () => {
        (qb as any).search();
        expect(qb.queryObject).toEqual({});
      });
      it('should not throw, 2', () => {
        (qb as any).search(false);
        expect(qb.queryObject).toEqual({});
      });
      it('should set search string, 1', () => {
        const test = qb
          .search({ $or: [{ id: 1 }, { name: 'foo' }] })
          .query(false);
        expect(test).toEqual('s={"$or":[{"id":1},{"name":"foo"}]}');
      });
      it('should set search string, 2', () => {
        const test = qb.search({ $or: [{ id: 1 }, { name: 'foo' }] }).query();
        expect(test).toEqual(
          's=%7B%22%24or%22%3A%5B%7B%22id%22%3A1%7D%2C%7B%22name%22%3A%22foo%22%7D%5D%7D',
        );
      });
    });

    describe('#createFromParams', () => {
      it('should return an empty query string', () => {
        expect(CrudQueryBuilder.create().query()).toEqual('');
      });
      it('should return a valid query string, 1', () => {
        const test = CrudQueryBuilder.create({
          fields: ['foo', 'bar'],
          filter: ['is', 'nnull'],
          or: { field: 'ok', operator: 'ne', value: false },
          limit: 1,
          offset: 2,
          page: 3,
          sort: [['foo', 'DESC']],
          resetCache: true,
        }).query(false);
        expect(test).toEqual(
          'select=foo,bar&filter[0]=is||$nnull&or[0]=ok||$ne||false&limit=1&offset=2&page=3&sort[0]=foo,DESC&cache=0',
        );
      });
      it('should return a valid query string, 2', () => {
        const test = CrudQueryBuilder.create({
          fields: ['foo', 'bar'],
        }).query(false);
        expect(test).toEqual('select=foo,bar');
      });
      it('should create from params with search', () => {
        const test = CrudQueryBuilder.create({
          search: { $or: [{ id: 1 }] },
        }).query(false);
        expect(test).toEqual('s={"$or":[{"id":1}]}');
      });
      it('should create from params with includeDeleted', () => {
        const test = CrudQueryBuilder.create({
          includeDeleted: 1,
        }).query(false);
        expect(test).toEqual('includeDeleted=1');
      });
    });
  });
});

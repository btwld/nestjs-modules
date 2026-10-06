import { BadRequestException } from '@nestjs/common';

import { mockCrudContext } from '../../../../__fixtures__/crud/mocks/crud-context.mock.js';
import { CrudQueryException } from '../../../../infrastructure/exceptions/crud-query.exception.js';
import { CrudReadQuery } from '../../impl/crud-read.query.js';
import { CrudReadHandler } from '../crud-read.handler.js';

import {
  type TestCrudAdapter,
  type TestEntity,
  createTestAdapter,
} from './fixtures/query-handler-test.fixture.js';

describe('CrudReadHandler', () => {
  let adapter: TestCrudAdapter;

  beforeAll(() => {
    adapter = createTestAdapter();
  });

  describe('execute', () => {
    it('should delegate to crudAdapter.read()', async () => {
      const handler = new CrudReadHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();
      const entity: TestEntity = { id: '1', name: 'Alice' };

      vi.spyOn(adapter, 'read').mockResolvedValueOnce(entity);

      const result = await handler.execute(new CrudReadQuery(context));

      expect(result).toEqual(entity);
      expect(adapter.read).toHaveBeenCalledWith(context);
    });

    it('should re-throw HttpException as-is', async () => {
      const handler = new CrudReadHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();
      const httpError = new BadRequestException('Invalid request');

      vi.spyOn(adapter, 'read').mockRejectedValueOnce(httpError);

      await expect(handler.execute(new CrudReadQuery(context))).rejects.toThrow(
        httpError,
      );
    });

    it('should wrap non-Http errors in CrudQueryException', async () => {
      const handler = new CrudReadHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();

      vi.spyOn(adapter, 'read').mockRejectedValueOnce(
        new Error('database timeout'),
      );

      await expect(handler.execute(new CrudReadQuery(context))).rejects.toThrow(
        CrudQueryException,
      );
    });

    it('should include entity name in CrudQueryException', async () => {
      const handler = new CrudReadHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();

      vi.spyOn(adapter, 'read').mockRejectedValueOnce(
        new Error('connection lost'),
      );
      vi.spyOn(adapter, 'entityName').mockReturnValue('TestEntity');

      try {
        await handler.execute(new CrudReadQuery(context));
        throw new Error('Expected CrudQueryException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(CrudQueryException);
        expect((e as CrudQueryException).context.entityName).toEqual(
          'TestEntity',
        );
      }
    });
  });
});

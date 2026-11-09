import { BadRequestException } from '@nestjs/common';

import { mockCrudContext } from '../../../../__fixtures__/crud/mocks/crud-context.mock.js';
import { createPaginatedResponse } from '../../../../__fixtures__/crud/mocks/crud-paginated-response.mock.js';
import { CrudQueryException } from '../../../../infrastructure/exceptions/crud-query.exception.js';
import { CrudListQuery } from '../../impl/crud-list.query.js';
import { CrudListHandler } from '../crud-list.handler.js';

import {
  type TestCrudAdapter,
  type TestEntity,
  createTestAdapter,
} from './fixtures/query-handler-test.fixture.js';

describe('CrudListHandler', () => {
  let adapter: TestCrudAdapter;

  beforeAll(() => {
    adapter = createTestAdapter();
  });

  describe('execute', () => {
    it('should delegate to crudAdapter.list()', async () => {
      const handler = new CrudListHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();
      const paginatedResult = createPaginatedResponse<TestEntity>([
        { id: '1', name: 'Alice' },
      ]);

      vi.spyOn(adapter, 'list').mockResolvedValueOnce(paginatedResult);

      const result = await handler.execute(new CrudListQuery(context));

      expect(result).toEqual(paginatedResult);
      expect(adapter.list).toHaveBeenCalledWith(context);
    });

    it('should re-throw HttpException as-is', async () => {
      const handler = new CrudListHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();
      const httpError = new BadRequestException('Invalid query');

      vi.spyOn(adapter, 'list').mockRejectedValueOnce(httpError);

      await expect(handler.execute(new CrudListQuery(context))).rejects.toThrow(
        httpError,
      );
    });

    it('should wrap non-Http errors in CrudQueryException', async () => {
      const handler = new CrudListHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();

      vi.spyOn(adapter, 'list').mockRejectedValueOnce(
        new Error('database timeout'),
      );

      await expect(handler.execute(new CrudListQuery(context))).rejects.toThrow(
        CrudQueryException,
      );
    });

    it('should include entity name in CrudQueryException', async () => {
      const handler = new CrudListHandler<TestEntity>(adapter);
      const context = mockCrudContext<TestEntity>();

      vi.spyOn(adapter, 'list').mockRejectedValueOnce(
        new Error('connection lost'),
      );
      vi.spyOn(adapter, 'entityName').mockReturnValue('TestEntity');

      try {
        await handler.execute(new CrudListQuery(context));
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

import { CrudQueryException } from '../../../../infrastructure/exceptions/crud-query.exception.js';
import { CrudQueryBaseHandler } from '../crud-query-base.handler.js';

import {
  type TestCrudAdapter,
  createTestAdapter,
} from './fixtures/query-handler-test.fixture.js';

describe('CrudQueryBaseHandler', () => {
  let adapter: TestCrudAdapter;

  beforeAll(() => {
    adapter = createTestAdapter();
  });

  describe('execute', () => {
    it('should throw CrudQueryException from base implementation', () => {
      const handler = new CrudQueryBaseHandler(adapter);
      expect(() => handler.execute({} as never)).toThrow(CrudQueryException);
    });
  });
});

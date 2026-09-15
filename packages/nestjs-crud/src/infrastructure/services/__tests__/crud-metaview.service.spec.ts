import { z } from 'zod';

import { CrudJoin } from '../../decorators/routes/crud-join.decorator.js';
import { CrudRequestBodyBatch } from '../../decorators/routes/crud-request-body-batch.decorator.js';
import { CrudRequestBody } from '../../decorators/routes/crud-request-body.decorator.js';
import { CrudResponseResource } from '../../decorators/routes/crud-response-resource.decorator.js';
import { CrudReturnRestored } from '../../decorators/routes/crud-return-restored.decorator.js';
import { CrudValidate } from '../../decorators/routes/crud-validate.decorator.js';
import { CrudMetaview } from '../crud-metaview.service.js';

describe('CrudMetaview', () => {
  const metaview = new CrudMetaview();

  describe('getValidationOptions', () => {
    it('should resolve from handler then class when handler is provided', () => {
      @CrudValidate({ transform: true })
      class TestController {
        @CrudValidate({ validateCustomDecorators: true })
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getValidationOptions(TestController, handler);
      expect(result).toEqual({ validateCustomDecorators: true });
    });

    it('should fall back to class when handler has no metadata', () => {
      @CrudValidate({ transform: true })
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getValidationOptions(TestController, handler);
      expect(result).toEqual({ transform: true });
    });

    it('should resolve from target when handler is omitted', () => {
      @CrudValidate({ transform: true })
      class TestController {
        testMethod() {}
      }

      const result = metaview.getValidationOptions(TestController);
      expect(result).toEqual({ transform: true });
    });
  });

  describe('getRequestBodyBatch', () => {
    it('should resolve batch body type from method', () => {
      const batchSchema = z.object({});

      class TestController {
        @CrudRequestBodyBatch(batchSchema)
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getRequestBodyBatch(TestController, handler);
      expect(result).toBe(batchSchema);
    });

    it('should resolve batch body type from class', () => {
      const batchSchema = z.object({});

      @CrudRequestBodyBatch(batchSchema)
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getRequestBodyBatch(TestController, handler);
      expect(result).toBe(batchSchema);
    });

    it('should return undefined when not decorated', () => {
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getRequestBodyBatch(TestController, handler);
      expect(result).toBeUndefined();
    });
  });

  describe('getReturnRestored', () => {
    it('should return true when decorated', () => {
      @CrudReturnRestored(true)
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getReturnRestored(TestController, handler);
      expect(result).toBe(true);
    });

    it('should default to false when not decorated', () => {
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getReturnRestored(TestController, handler);
      expect(result).toBe(false);
    });
  });

  describe('getRequestBody', () => {
    it('should resolve body type from method', () => {
      const bodySchema = z.object({});

      class TestController {
        @CrudRequestBody(bodySchema)
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getRequestBody(TestController, handler);
      expect(result).toBe(bodySchema);
    });

    it('should return undefined when not decorated', () => {
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getRequestBody(TestController, handler);
      expect(result).toBeUndefined();
    });
  });

  describe('getResponseResource', () => {
    it('should resolve response type from method', () => {
      const resourceSchema = z.object({});

      class TestController {
        @CrudResponseResource(resourceSchema)
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getResponseResource(TestController, handler);
      expect(result).toBe(resourceSchema);
    });

    it('should return undefined when not decorated', () => {
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getResponseResource(TestController, handler);
      expect(result).toBeUndefined();
    });
  });

  describe('getContextOptions (join)', () => {
    it('should resolve join from class decorator', () => {
      @CrudJoin([{ relation: 'posts' }])
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getContextOptions(TestController, handler);
      expect(result.query?.join).toEqual([{ relation: 'posts' }]);
    });

    it('should resolve join from method decorator', () => {
      class TestController {
        @CrudJoin([{ relation: 'profile', joinType: 'INNER' }])
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getContextOptions(TestController, handler);
      expect(result.query?.join).toEqual([
        { relation: 'profile', joinType: 'INNER' },
      ]);
    });

    it('should merge class and method join with deduplication by relation', () => {
      @CrudJoin([{ relation: 'posts', joinType: 'LEFT' }, { relation: 'tags' }])
      class TestController {
        @CrudJoin([{ relation: 'posts', joinType: 'INNER' }])
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getContextOptions(TestController, handler);
      expect(result.query?.join).toEqual([
        { relation: 'posts', joinType: 'INNER' },
        { relation: 'tags' },
      ]);
    });

    it('should return undefined when not decorated', () => {
      class TestController {
        testMethod() {}
      }

      const handler = TestController.prototype.testMethod;
      const result = metaview.getContextOptions(TestController, handler);
      expect(result.query?.join).toBeUndefined();
    });
  });
});

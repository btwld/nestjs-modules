import { Controller } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_QUERY_METADATA } from '../../../access-control.constants.js';
import { AccessControlContextInterface } from '../../../domain/interfaces/access-control-context.interface.js';
import { CanAccess } from '../../../domain/policies/can-access.policy.js';
import { AccessControlQuery } from '../access-control-query.decorator.js';

describe('@AccessControlQuery', () => {
  class TestQueryService implements CanAccess {
    async canAccess(_context: AccessControlContextInterface): Promise<boolean> {
      return true;
    }
  }

  @Controller()
  class TestController {
    @AccessControlQuery({
      service: TestQueryService,
    })
    createOne() {
      return null;
    }
  }

  const controller = new TestController();

  describe('enhance controller methods with access control query', () => {
    it('createOne should have query on metadata', () => {
      const grants = Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_QUERY_METADATA,
        controller.createOne,
      );

      expect(grants).toEqual([
        {
          service: TestQueryService,
        },
      ]);
    });
  });
});

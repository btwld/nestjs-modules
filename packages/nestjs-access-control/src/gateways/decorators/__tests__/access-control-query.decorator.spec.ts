import { Controller } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';

import { ACCESS_CONTROL_MODULE_QUERY_METADATA } from '../../../access-control.constants.js';
import { AccessControlException } from '../../../domain/exceptions/access-control.exception.js';
import { AccessControlContextInterface } from '../../../domain/interfaces/access-control-context.interface.js';
import { CanAccess } from '../../../domain/interfaces/can-access.interface.js';
import { AccessControlGuard } from '../../http/access-control.guard.js';
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

    it('refuses no services, which would clear a controller’s', () => {
      expect(() => AccessControlQuery()).toThrow(
        expect.objectContaining({
          constructor: AccessControlException,
          fault: 'usage',
        }),
      );
    });

    it('applies the access control guard, so a route without a grant fails', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, controller.createOne),
      ).toEqual([AccessControlGuard]);
    });
  });
});

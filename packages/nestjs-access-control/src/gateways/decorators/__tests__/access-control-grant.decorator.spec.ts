import { Controller } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';

import { ActionEnum } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../../access-control.constants.js';
import { AccessControlGuard } from '../../http/access-control.guard.js';
import { AccessControlGrant } from '../access-control-grant.decorator.js';

describe('@AccessControlGrant', () => {
  const resource = 'a_protected_resource';

  @Controller()
  class TestController {
    @AccessControlGrant({
      resource: resource,
      action: ActionEnum.CREATE,
    })
    createOne() {
      return null;
    }
    @AccessControlGrant({
      resource: resource,
      action: ActionEnum.READ,
    })
    getOne() {
      return null;
    }
    @AccessControlGrant({
      resource: resource,
      action: ActionEnum.UPDATE,
    })
    updateOne() {
      return null;
    }
    @AccessControlGrant({
      resource: resource,
      action: ActionEnum.DELETE,
    })
    deleteOne() {
      return null;
    }
  }

  const controller = new TestController();

  describe('enhance controller methods with access control grants', () => {
    it('createOne should have create grants metadata', () => {
      const grants = Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.createOne,
      );

      expect(grants).toEqual([
        {
          resource: resource,
          action: ActionEnum.CREATE,
        },
      ]);
    });

    it('getOne should have read grants metadata', () => {
      const grants = Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.getOne,
      );

      expect(grants).toEqual([
        {
          resource: resource,
          action: ActionEnum.READ,
        },
      ]);
    });

    it('updateOne should have update grants metadata', () => {
      const grants = Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.updateOne,
      );

      expect(grants).toEqual([
        {
          resource: resource,
          action: ActionEnum.UPDATE,
        },
      ]);
    });

    it('deleteOne should have delete grants metadata', () => {
      const grants = Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.deleteOne,
      );

      expect(grants).toEqual([
        {
          resource: resource,
          action: ActionEnum.DELETE,
        },
      ]);
    });

    it('applies the access control guard to the route', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, controller.createOne),
      ).toEqual([AccessControlGuard]);
    });

    it('refuses to declare a route with no grant', () => {
      expect(() => AccessControlGrant()).toThrow(
        '@AccessControlGrant needs at least one grant',
      );
    });

    it('accepts an action of your own', () => {
      class ApproveController {
        @AccessControlGrant({ resource, action: 'approve' })
        approve() {
          return null;
        }
      }

      expect(
        Reflect.getMetadata(
          ACCESS_CONTROL_MODULE_GRANT_METADATA,
          new ApproveController().approve,
        ),
      ).toEqual([{ resource, action: 'approve' }]);
    });
  });
});

import { Controller } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../../access-control.constants.js';
import { AccessControlUpdateOne } from '../access-control-update-one.decorator.js';

describe('@AccessControlUpdateOne', () => {
  const resource = 'a_protected_resource';

  @Controller()
  class TestController {
    @AccessControlUpdateOne(resource)
    updateOne() {
      return null;
    }
  }

  const controller = new TestController();

  describe('enhance controller method with access control', () => {
    it('should have grants metadata', () => {
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
  });
});

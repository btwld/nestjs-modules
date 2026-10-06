import { Controller } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../../access-control.constants.js';
import { AccessControlCreateOne } from '../access-control-create-one.decorator.js';

describe('@AccessControlCreateOne', () => {
  const resource = 'a_protected_resource';

  @Controller()
  class TestController {
    @AccessControlCreateOne(resource)
    createOne() {
      return null;
    }
  }

  const controller = new TestController();

  describe('enhance controller method with access control', () => {
    it('should have grants metadata', () => {
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
  });
});

import { Controller } from '@nestjs/common';

import { ActionEnum } from '@concepta/nestjs-core';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../../access-control.constants.js';
import { AccessControlSoftDeleteOne } from '../access-control-soft-delete-one.decorator.js';

describe('@AccessControlSoftDeleteOne', () => {
  const resource = 'a_protected_resource';

  @Controller()
  class TestController {
    @AccessControlSoftDeleteOne(resource)
    softDeleteOne() {
      return null;
    }
  }

  const controller = new TestController();

  it('should grant the soft delete action', () => {
    const grants = Reflect.getMetadata(
      ACCESS_CONTROL_MODULE_GRANT_METADATA,
      controller.softDeleteOne,
    );

    expect(grants).toEqual([{ resource, action: ActionEnum.SOFT_DELETE }]);
  });
});

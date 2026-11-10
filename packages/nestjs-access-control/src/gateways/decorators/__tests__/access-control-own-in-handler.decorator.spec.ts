import { Controller } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA } from '../../../access-control.constants.js';
import { AccessControlOwnInHandler } from '../access-control-own-in-handler.decorator.js';

describe('@AccessControlOwnInHandler', () => {
  @Controller()
  class TestController {
    @AccessControlOwnInHandler()
    list() {
      return null;
    }
  }

  it('marks the route as deciding ownership in its handler', () => {
    expect(
      Reflect.getMetadata(
        ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA,
        new TestController().list,
      ),
    ).toEqual(true);
  });
});

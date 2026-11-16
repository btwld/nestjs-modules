import {
  AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
  AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
} from '../../../authentication.constants.js';
import { AuthPublic } from '../auth-public.decorator.js';

describe(AuthPublic.name, () => {
  class TestController {
    @AuthPublic()
    plain() {
      return null;
    }

    @AuthPublic({ optional: true })
    optional() {
      return null;
    }
  }

  @AuthPublic({ classLevel: true })
  class PublicController {}

  const controller = new TestController();

  it('should set metadata to disable guards (method-level)', () => {
    expect(
      Reflect.getMetadata(
        AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
        controller.plain,
      ),
    ).toEqual(true);
    // Set to false, so it overrides a controller's optional.
    expect(
      Reflect.getMetadata(
        AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
        controller.plain,
      ),
    ).toEqual(false);
  });

  it('should set metadata with classLevel marker', () => {
    expect(
      Reflect.getMetadata(
        AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
        PublicController,
      ),
    ).toEqual('classLevel');
  });

  it('should mark optional authentication', () => {
    expect(
      Reflect.getMetadata(
        AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
        controller.optional,
      ),
    ).toEqual(true);
    expect(
      Reflect.getMetadata(
        AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
        controller.optional,
      ),
    ).toEqual(true);
  });
});

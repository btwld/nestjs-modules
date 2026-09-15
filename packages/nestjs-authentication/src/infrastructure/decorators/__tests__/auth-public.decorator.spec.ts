import { SetMetadata } from '@nestjs/common';

import { AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN } from '../../../authentication.constants.js';
import { AuthPublic } from '../auth-public.decorator.js';

vi.mock('@nestjs/common', () => {
  return {
    SetMetadata: vi.fn().mockImplementation(() => 'mocked SetMetadata'), // Mock SetMetadata
  };
});

describe(AuthPublic.name, () => {
  it('should set metadata to disable guards (method-level)', () => {
    AuthPublic();
    expect(SetMetadata).toHaveBeenCalledWith(
      AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
      true,
    );
  });

  it('should set metadata with classLevel marker', () => {
    AuthPublic({ classLevel: true });
    expect(SetMetadata).toHaveBeenCalledWith(
      AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
      'classLevel',
    );
  });
});

import { type CanActivate } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { type AuthenticationOptionsExtrasInterface } from '../../config/interfaces/authentication-options-extras.interface.js';
import { type AuthenticationOptionsInterface } from '../../config/interfaces/authentication-options.interface.js';
import { createJwtAppGuardProvider } from '../create-jwt-app-guard-provider.js';

const OPTIONS = Symbol('options');

/** The global guard `forRoot` would register, from its options and extras. */
function appGuardFor(
  options: AuthenticationOptionsInterface,
  extras: AuthenticationOptionsExtrasInterface,
  defaultGuard: CanActivate,
): unknown {
  const provider = createJwtAppGuardProvider(OPTIONS, extras);
  if (!('useFactory' in provider)) {
    throw new Error('expected a factory provider');
  }
  expect(provider.provide).toBe(APP_GUARD);
  return provider.useFactory(options, defaultGuard);
}

const WITH_JWT: AuthenticationOptionsInterface = {
  settings: { strategies: { jwt: {} } },
};

describe('createJwtAppGuardProvider', () => {
  const defaultGuard: CanActivate = { canActivate: () => true };
  const yours: CanActivate = { canActivate: () => false };

  it('should register the default JWT guard when no appGuard is given', () => {
    expect(appGuardFor(WITH_JWT, {}, defaultGuard)).toBe(defaultGuard);
  });

  it('should register the appGuard instance as it is, injecting nothing', () => {
    expect(appGuardFor(WITH_JWT, { appGuard: yours }, defaultGuard)).toBe(
      yours,
    );
  });

  it('should register no global guard when appGuard is false', () => {
    expect(appGuardFor(WITH_JWT, { appGuard: false }, defaultGuard)).toBe(null);
  });

  it.each([
    ['no settings', {}],
    ['no strategies', { settings: {} }],
    ['no jwt strategy', { settings: { strategies: {} } }],
  ])(
    'should ignore appGuard with %s, registering no global guard',
    (_name, options: AuthenticationOptionsInterface) => {
      expect(appGuardFor(options, { appGuard: yours }, defaultGuard)).toBe(
        null,
      );
    },
  );
});

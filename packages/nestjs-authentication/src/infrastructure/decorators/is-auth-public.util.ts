import { AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN } from '../../authentication.constants.js';

import { type AuthPublicMetadata } from './auth-public.decorator.js';

/**
 * Whether any of the given targets is decorated with `@AuthPublic()`.
 *
 * Checks every target given (not just the first) — unlike `@Transactional()`,
 * `@AuthPublic()` has no method-overrides-class precedence: a handler and
 * its class are each read independently by `AuthGuard`, so a caller wanting
 * that same "public if the metadata is set anywhere in the chain" answer
 * should pass both.
 *
 * `AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN` itself stays unexported so
 * consumers don't couple to how this metadata is stored — read it through
 * this function instead.
 */
export function isAuthPublic(...targets: object[]): boolean {
  return targets.some((target) => {
    const value: AuthPublicMetadata | undefined = Reflect.getMetadata(
      AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
      target,
    );
    return value === true || value === 'classLevel';
  });
}

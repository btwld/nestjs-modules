import { applyDecorators, SetMetadata } from '@nestjs/common';

import { PublicRoute } from '@concepta/nestjs-core';

import {
  AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
  AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
} from '../../authentication.constants.js';

export interface AuthPublicOptions {
  classLevel?: boolean;
  /**
   * Authenticate a caller who sends credentials, and let one who sends
   * none, or bad ones, through as nobody: never refused.
   */
  optional?: boolean;
}

export type AuthPublicMetadata = true | 'classLevel';

/**
 * Disable ONLY AuthGuards that have the `canDisable` option set to true.
 *
 * When applied at the **class level**, pass `{ classLevel: true }` to
 * make the intent explicit and suppress the runtime warning. Without this option,
 * a warning is emitted on every request where the class-level decorator is active.
 *
 * Pass `{ optional: true }` for a public route that still recognises a
 * signed-in caller: credentials, when sent and valid, sign the caller in;
 * missing or invalid ones leave the call anonymous instead of refusing it.
 *
 * @example Method-level (default, no warning):
 * ```ts
 * @Get('public')
 * @AuthPublic()
 * getPublic() {}
 * ```
 *
 * @example Class-level (explicit opt-in, no warning):
 * ```ts
 * @AuthPublic({ classLevel: true })
 * @Controller('public')
 * class PublicController {}
 * ```
 *
 * @example Optional authentication:
 * ```ts
 * @Get('catalog')
 * @AuthPublic({ optional: true })
 * getCatalog(@AuthUser() user?: AuthenticatedUserInterface) {}
 * ```
 */
export const AuthPublic = (
  options?: AuthPublicOptions,
): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    // Tells route audit rules the route is open on purpose.
    PublicRoute(),
    SetMetadata<string, AuthPublicMetadata>(
      AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
      options?.classLevel ? 'classLevel' : true,
    ),
    // Set either way, so a method's plain `@AuthPublic()` overrides a
    // controller's `{ optional: true }`.
    SetMetadata(
      AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
      options?.optional === true,
    ),
  );

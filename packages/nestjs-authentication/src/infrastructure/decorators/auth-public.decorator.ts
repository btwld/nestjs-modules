import { SetMetadata } from '@nestjs/common';

import { AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN } from '../../authentication.constants.js';

export interface AuthPublicOptions {
  classLevel?: boolean;
}

export type AuthPublicMetadata = true | 'classLevel';

/**
 * Disable ONLY AuthGuards that have the `canDisable` option set to true.
 *
 * When applied at the **class level**, pass `{ classLevel: true }` to
 * make the intent explicit and suppress the runtime warning. Without this option,
 * a warning is emitted on every request where the class-level decorator is active.
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
 */
export const AuthPublic = (options?: AuthPublicOptions) =>
  SetMetadata<string, AuthPublicMetadata>(
    AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
    options?.classLevel ? 'classLevel' : true,
  );

import { type Type } from '@nestjs/common';

import { type AuthorityInterface } from '@concepta/nestjs-core';

/**
 * An entity whose reads and writes an authority decides.
 */
export interface AuthorityGovernedRegistration {
  readonly access: 'governed';
  readonly authority: Type<AuthorityInterface>;
}

/**
 * An entity deliberately left to any caller.
 *
 * `reason` is required so that "open" has to be written down rather than
 * defaulted into. Nothing reads it.
 */
export interface AuthorityOpenRegistration {
  readonly access: 'open';
  readonly reason: string;
}

/**
 * An authority declaration, written inline in the `forRoot()` entities
 * array.
 */
export type AuthorityRegistration =
  AuthorityGovernedRegistration | AuthorityOpenRegistration;

/**
 * Narrow a declaration to the governed variant.
 */
export function isAuthorityGoverned(
  registration: AuthorityRegistration | undefined,
): registration is AuthorityGovernedRegistration {
  return registration?.access === 'governed';
}

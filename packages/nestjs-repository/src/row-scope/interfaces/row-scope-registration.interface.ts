import { type Type } from '@nestjs/common';

import { type RowScopeInterface } from './row-scope.interface.js';

/**
 * An entity whose rows are scoped, and the resolver that scopes them.
 */
export interface RowScopeScopedRegistration {
  readonly access: 'scoped';
  readonly resolver: Type<RowScopeInterface>;
}

/**
 * An entity whose rows are deliberately not scoped.
 *
 * `reason` is required so that "public" has to be written down rather than
 * defaulted into. Nothing reads it.
 */
export interface RowScopePublicRegistration {
  readonly access: 'public';
  readonly reason: string;
}

/**
 * A row scope declaration, written inline in the `forFeature()` entities
 * array.
 *
 * Discriminated on an explicit `access` tag rather than on shape, so adding a
 * field to either variant cannot silently change which one a declaration is.
 */
export type RowScopeRegistration =
  RowScopeScopedRegistration | RowScopePublicRegistration;

/**
 * Narrow a declaration to the scoped variant.
 */
export function isRowScopeScoped(
  registration: RowScopeRegistration | undefined,
): registration is RowScopeScopedRegistration {
  return registration?.access === 'scoped';
}

import { type PlainLiteralObject } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';

import { type CrudAdapter } from '../adapters/crud.adapter.js';

import { getDynamicAdapterToken } from './crud-infra.utils.js';

/**
 * Resolve the `CrudAdapter` registered for `entity` from the DI container.
 * Shared by `CrudAdapterResolver` (the default operation dispatcher) and
 * anything else that needs adapter metadata outside the resolver's own
 * dispatch path — `CrudContextOverlay`'s precondition validation and
 * `CrudETagInterceptor`'s version-column lookup both resolve the same
 * adapter this way rather than re-deriving the token.
 */
export function resolveCrudAdapter<Entity extends PlainLiteralObject>(
  moduleRef: ModuleRef,
  entity: string,
): CrudAdapter<Entity> {
  const adapterToken = getDynamicAdapterToken(entity);
  return moduleRef.get(adapterToken, { strict: false });
}

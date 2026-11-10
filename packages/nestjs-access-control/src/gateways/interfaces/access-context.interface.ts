import { OverlayRef } from '@concepta/nestjs-core';

import { type AccessActor } from '../../domain/interfaces/access-actor.type.js';

/**
 * The context overlay carrying who is acting for a call, read by the
 * default actor resolver.
 *
 * Attach it from a `ContextOverlayInterceptor`, derived from the
 * authenticated principal and defined `{ immutable: true }`. An integration
 * consumer acting for an external system defines `{ kind: 'system', name }`
 * on the context it opens for each message.
 */
export const AccessCtx = new OverlayRef<'withAccess', AccessActor>(
  'withAccess',
);

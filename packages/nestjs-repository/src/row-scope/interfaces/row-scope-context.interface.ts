import { type PlainLiteralObject } from '@nestjs/common';

import { OverlayRef } from '@concepta/nestjs-core';

/**
 * The context overlay carrying whatever identifies the principal a row scope
 * resolver enforces against — a tenant id, a role, whatever the deployment's
 * notion of scope is. The framework never interprets it.
 *
 * Attach it from a `ContextOverlayInterceptor` and define it
 * `{ immutable: true }`, derived from the authenticated principal — a
 * client-supplied header is a tenant-spoof unless a trusted gateway sets it.
 * See "Where scope comes from" in the README.
 */
export const RowScopeCtx = new OverlayRef<'withRowScope', PlainLiteralObject>(
  'withRowScope',
);

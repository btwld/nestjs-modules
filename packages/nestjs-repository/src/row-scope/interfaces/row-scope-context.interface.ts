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
 * The README's "Where scope comes from" carries the interceptor example.
 *
 * Three things that are easy to get wrong:
 *
 * - Read it as `params.scope` in a resolver, never off `params.ctx`. It is
 *   resolved *before* hooks run, which is what stops a hook deciding which
 *   principal is enforced.
 * - Define it unconditionally, not only when a tenant is present — an overlay
 *   that is always present and immutable cannot be supplied after the fact.
 * - Keep its values flat; `{ immutable: true }` freezes one level deep.
 *
 * One overlay serves every scoped entity, so carry per-principal facts rather
 * than per-entity ones.
 */
export const RowScopeCtx = new OverlayRef<'withRowScope', PlainLiteralObject>(
  'withRowScope',
);

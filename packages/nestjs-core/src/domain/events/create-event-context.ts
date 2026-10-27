import { type PlainLiteralObject } from '@nestjs/common';

import { AppContextHost } from '../../infrastructure/context/app-context.host.js';

import { AppContextHostCausalResolver } from './app-context-host-causal-resolver.js';
import { type EventContextHeadersInterface } from './causal-context/causal-context-headers.interface.js';
import { createCausalContext } from './causal-context/create-causal-context.js';
import { type EventContextHost } from './causal-context/event-context.host.js';

/**
 * `AppContextHost.from` throws on a non-empty, non-`AppContextHost` value.
 * Plain `new EventContextHost(...)` could never throw, so construction via
 * `createEventContext` should not gain that new failure mode — any
 * resolution problem just degrades to the synthetic-fallback path in
 * {@link createCausalContext}, the same path a seed script hits today.
 */
function resolveAppContextDefensively(ctx: PlainLiteralObject): AppContextHost {
  try {
    return AppContextHost.from(ctx);
  } catch {
    return AppContextHost.from({});
  }
}

export function createEventContext<
  E extends PlainLiteralObject = PlainLiteralObject,
  M extends PlainLiteralObject = PlainLiteralObject,
>(
  ctx: PlainLiteralObject,
  extraHeaders: E,
  metadata: M,
): EventContextHost<EventContextHeadersInterface & E, M> {
  const appCtx = resolveAppContextDefensively(ctx);
  const resolver = new AppContextHostCausalResolver(appCtx);
  return createCausalContext(resolver, extraHeaders, metadata);
}

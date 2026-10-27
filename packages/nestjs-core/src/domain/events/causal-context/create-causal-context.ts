import { type EventContextHeadersInterface } from './causal-context-headers.interface.js';
import { type CausalContextResolver } from './causal-context-resolver.interface.js';
import { EventContextHost } from './event-context.host.js';

/**
 * Resolves the correlation/causation pair via `resolver`, or mints and
 * memoizes a fresh self-correlated pair (`correlationId === causationId`)
 * when no pair is resolvable — the degenerate case for an operation with
 * no traceable origin (a seed script, a bare unit test), visibly
 * distinguishable from a real chain because the two ids match.
 */
export function createCausalContext<
  E extends Record<string, unknown> = Record<string, unknown>,
  M extends Record<string, unknown> = Record<string, unknown>,
>(
  resolver: CausalContextResolver,
  extraHeaders: E,
  metadata: M,
): EventContextHost<EventContextHeadersInterface & E, M> {
  const resolved = resolver.resolve();

  let pair: { correlationId: string; causationId: string };

  if (resolved) {
    pair = resolved;
  } else {
    const correlationId = globalThis.crypto.randomUUID();
    pair = { correlationId, causationId: correlationId };
    resolver.memoize(pair);
  }

  const headers: EventContextHeadersInterface & E = {
    ...extraHeaders,
    correlationId: pair.correlationId,
    causationId: pair.causationId,
    recordedAt: new Date(),
  };

  return new EventContextHost(headers, metadata);
}

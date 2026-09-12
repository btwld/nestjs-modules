import { type PlainLiteralObject } from '@nestjs/common';

import { type EventContextHeadersInterface } from '../domain/events/causal-context/causal-context-headers.interface.js';
import { EventContextHost } from '../domain/events/causal-context/event-context.host.js';

const TEST_CORRELATION_ID = 'test-correlation-id';
const TEST_CAUSATION_ID = 'test-causation-id';
const TEST_RECORDED_AT = new Date('2024-01-01T00:00:00.000Z');

/**
 * Builds an `EventContextHost` with a fixed, deterministic correlation
 * pair for unit tests that don't exercise correlation behavior directly
 * but still need a valid context to satisfy the compile guard.
 */
export function createTestEventContext<
  E extends PlainLiteralObject = PlainLiteralObject,
  M extends PlainLiteralObject = PlainLiteralObject,
>(
  extraHeaders: E,
  metadata: M,
): EventContextHost<EventContextHeadersInterface & E, M> {
  const headers: EventContextHeadersInterface & E = {
    ...extraHeaders,
    correlationId: TEST_CORRELATION_ID,
    causationId: TEST_CAUSATION_ID,
    recordedAt: TEST_RECORDED_AT,
  };

  return new EventContextHost(headers, metadata);
}

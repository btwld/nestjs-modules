import { type PlainLiteralObject } from '@nestjs/common';

/**
 * Correlation/causation pair seeded once per inbound request by
 * {@link CorrelationContextOverlay} and read back by
 * {@link AppContextHostCausalResolver} when constructing event contexts.
 */
export interface CorrelationContextInterface extends PlainLiteralObject {
  correlationId: string;
  causationId: string;
}

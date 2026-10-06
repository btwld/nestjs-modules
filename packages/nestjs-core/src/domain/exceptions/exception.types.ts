import { type ExceptionContext } from '../types/operation.types.js';

export type RuntimeExceptionContext = ExceptionContext & {
  originalError?: Error;
};

/**
 * Classifies *who* is at fault for a `RuntimeException`, independent of the
 * HTTP status it renders with. Intended for a peer logging module to decide
 * log level/severity without guessing from status codes — never rendered on
 * the wire (see `RuntimeException.getResponse()`).
 *
 * Open to extension — e.g. a future `dependency` value to separate "an
 * upstream/infra failure, possibly retryable" from "a bug, page someone",
 * both of which fall under `internal` today.
 */
export type RuntimeExceptionFault =
  | 'client' // the caller sent something invalid — expected in normal operation
  | 'usage' // the integrating developer misused the library — wiring, config, bad state
  | 'internal'; // a bug, or an unexpected infrastructure failure

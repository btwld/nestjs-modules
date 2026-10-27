/**
 * Base headers every event context carries, regardless of framework or
 * package. `namespace` and other domain-specific fields are supplied via
 * a per-call extension generic, not declared here.
 */
export interface EventContextHeadersInterface extends Record<string, unknown> {
  /** Stable across the whole causal chain. */
  correlationId: string;
  /** Id of the inbound request/command that caused this context to exist. */
  causationId: string;
  /** Auto-populated at context-construction time. */
  recordedAt: Date;
}

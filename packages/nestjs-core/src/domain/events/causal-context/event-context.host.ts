import { type EventContextHeadersInterface } from './causal-context-headers.interface.js';
import { type EventContextInterface } from './interfaces/event-context.interface.js';

/**
 * Frozen `{headers, metadata}` container passed to domain aggregate
 * factory/mutator methods and stored on every domain event.
 *
 * `H` is constrained to {@link EventContextHeadersInterface} so a caller
 * cannot construct a context missing the required causal fields — the
 * constraint is enforced at every call site, including explicit type
 * arguments. The one gap this leaves open (a caller satisfying the type
 * with garbage values, e.g. `correlationId: ''`) is accepted; closing it
 * would require branded types and a cast, which is not worth it here.
 */
export class EventContextHost<
  H extends EventContextHeadersInterface = EventContextHeadersInterface,
  M extends Record<string, unknown> = Record<string, unknown>,
> implements EventContextInterface<H, M> {
  readonly headers: H;
  readonly metadata: M;

  constructor(headers: H, metadata: M) {
    this.headers = { ...headers };
    this.metadata = { ...metadata };
    Object.freeze(this);
  }

  getHeader<K extends keyof H>(key: K): H[K] {
    return this.headers[key];
  }

  getMeta<K extends keyof M>(key: K): M[K] {
    return this.metadata[key];
  }
}

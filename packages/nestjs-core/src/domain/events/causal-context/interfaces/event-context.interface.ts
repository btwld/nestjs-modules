import { type EventContextHeadersInterface } from '../causal-context-headers.interface.js';

export interface EventContextInterface<
  H extends EventContextHeadersInterface = EventContextHeadersInterface,
  M extends Record<string, unknown> = Record<string, unknown>,
> {
  headers: H;
  metadata: M;

  getHeader<K extends keyof H>(key: K): H[K];
  getMeta<K extends keyof M>(key: K): M[K];
}

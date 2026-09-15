import { type EventBaseInterface } from './event-base.interface';

/**
 * The interface that all standard events must adhere to
 *
 */
export interface EventInterface<P = undefined> extends EventBaseInterface<
  P,
  void
> {}

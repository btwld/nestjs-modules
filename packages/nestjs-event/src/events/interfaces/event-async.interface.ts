import { type EventBaseInterface } from './event-base.interface';

/**
 * The interface that all async events must adhere to
 */
export interface EventAsyncInterface<
  P = undefined,
  R = P,
> extends EventBaseInterface<P, Promise<R>> {}

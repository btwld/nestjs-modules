import { type EventPayload } from '../../event-types';

import { type EventExpectsReturnOfInterface } from './event-expects-return-of.interface';
import { type EventKeyInterface } from './event-key.interface';

/**
 * The interface that defines Event key and payload signatures.
 */
export interface EventBaseInterface<P = undefined, R = P>
  extends EventKeyInterface, EventExpectsReturnOfInterface<R> {
  /**
   * Return the payload that should be emitted.
   */
  payload: EventPayload<P>;
}

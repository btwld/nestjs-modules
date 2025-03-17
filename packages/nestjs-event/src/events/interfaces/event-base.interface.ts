import { EventKeyInterface } from './event-key.interface';
import { EventExpectsReturnOfInterface } from './event-expects-return-of.interface';
import { EventPayload } from '../../event-types';

/**
 * The interface that defines Event key and payload signatures.
 */
export interface EventBaseInterface<P = undefined, R = P>
  extends EventKeyInterface,
    EventExpectsReturnOfInterface<R> {
  /**
   * Return the payload that should be emitted.
   */
  payload: EventPayload<P>;
}

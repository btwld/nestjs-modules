import { type EventInstance } from '../../event-types';

import { type EventKeyInterface } from './event-key.interface';

/**
 * Interface defining static signature of newable events.
 */
export interface EventClassInterface<E> extends EventKeyInterface {
  /**
   * @internal
   */
  new (payload?: (E & EventInstance<E>)['payload']): E & EventInstance<E>;
}

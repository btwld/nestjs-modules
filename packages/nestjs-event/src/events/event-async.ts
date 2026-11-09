import { EventManager } from '../event-manager';

import { EventBase } from './event-base';
import { type EventAsyncInterface } from './interfaces/event-async.interface';

/**
 * Abstract async event class.
 *
 * To create a custom **async** event, extend the
 * {@link EventAsync} class.
 *
 * You can override and customize the [payload]{@link EventBase#payload} getter
 * if desired. Please read the documentation for the abstract {@link EventBase} class
 * for the complete documentation.
 *
 * For standard events, see the {@link Event} abstract class.
 *
 * @example
 * ```ts
 * // event payload type
 * type MyPayloadType = {id: number, active: boolean};
 *
 * // event class
 * class MyEvent extends EventAsync<MyPayloadType> {}
 *
 * // create an event
 * const myEvent = new MyEvent({id: 1234, active: true});
 *
 * // emit the event
 * myEvent.emit();
 * ```
 */
export abstract class EventAsync<P = undefined, R = P>
  extends EventBase<P, Promise<R>>
  implements EventAsyncInterface<P, R>
{
  /**
   * Emit the event.
   */
  async emit() {
    return EventManager.dispatch.emitAsync<EventAsyncInterface<P, R>>(this);
  }
}

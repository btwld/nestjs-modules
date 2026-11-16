import { EventManager } from '../event-manager';

import { EventBase } from './event-base';
import { type EventInterface } from './interfaces/event.interface';

/**
 * Abstract event class.
 *
 * To create a custom event, extend the
 * {@link Event} class.
 *
 * You can override and customize the [payload]{@link EventBase#payload} getter
 * if desired. Please read the documentation for the abstract {@link EventBase} class
 * for the complete documentation.
 *
 * For asynchronous events, see the {@link EventAsync} abstract class.
 *
 * @example
 * ```ts
 * // event payload type
 * type MyPayloadType = {id: number, active: boolean};
 *
 * // event class
 * class MyEvent extends Event<MyPayloadType> {}
 *
 * // create an event
 * const myEvent = new MyEvent({id: 1234, active: true});
 *
 * // emit the event
 * myEvent.emit();
 * ```
 */
export abstract class Event<P = undefined>
  extends EventBase<P, void>
  implements EventInterface<P>
{
  /**
   * Emit the event.
   */
  emit(): boolean {
    return EventManager.dispatch.emit<P>(this);
  }
}

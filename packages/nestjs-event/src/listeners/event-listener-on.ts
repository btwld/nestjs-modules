import { EventManager } from '../event-manager';
import { type EventClassInterface } from '../events/interfaces/event-class.interface';
import { type EventListenOnOptionsInterface } from '../services/interfaces/event-listen-on-options.interface';
import { type EventListenOnInterface } from '../services/interfaces/event-listen-on.interface';

import { EventListener } from './event-listener';

/**
 * Abstract event listen on class.
 *
 * To create a custom event listener, extend the {@link EventListenerOn} class and implement the
 * [listen]{@link EventListenerOn#listen} method. The [listen]{@link EventListenerOn#listen}
 * method will receive the payload dispatched by {@link EventDispatchService}.
 *
 * @example
 * ```ts
 * // event payload type
 * type MyPayloadType = {id: number, active: boolean};
 *
 * // example event class
 * class MyEvent extends Event<MyPayloadType> {}
 *
 * // example listener class
 * class MyListenOn extends EventListenerOn<MyEvent> {
 *   // custom handler
 *   listen(event: MyEvent): void {
 *     console.log(event.payload);
 *   }
 * }
 *
 * // new listener
 * const myListener = new MyListenOn();
 *
 * // subscribe to the event
 * EventListenService.on(MyEvent, myListener);
 *
 * // and you can remove the listener easily
 * listener.remove();
 * ```
 */
export abstract class EventListenerOn<E>
  extends EventListener<E>
  implements EventListenOnInterface<E>
{
  /**
   * Constructor
   *
   * @param _options - Listener options
   */
  constructor(private _options: EventListenOnOptionsInterface = {}) {
    super();
  }

  /**
   * Default listener options.
   *
   * @returns The default listener options.
   */
  get options(): EventListenOnOptionsInterface {
    return this._options;
  }

  /**
   * Calls the global listern service on() method.
   *
   * @param eventClass - The event class to listen on.
   * @param options - Options overrides
   */
  on(
    eventClass: EventClassInterface<E>,
    options: EventListenOnOptionsInterface = {},
  ): void {
    EventManager.listen.on(eventClass, this, options);
  }
}

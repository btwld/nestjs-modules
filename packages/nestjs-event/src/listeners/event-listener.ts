import { Listener as EmitterListener } from 'eventemitter2';

import { EventInstance, EventReturnType } from '../event-types';
import { EventListenerException } from '../exceptions/event-listener.exception';

import { EventListenerInterface } from './interfaces/event-listener.interface';

/**
 * Abstract event listener class.
 *
 * To create a custom event listener, extend the {@link EventListener} class and implement the
 * [listen]{@link EventListener#listen} method. The [listen]{@link EventListener#listen}
 * method will receive the payload dispatched by {@link EventDispatchService}.
 *
 * You will also need to implement one of the interfaces that is enforced by the
 * {@link EventListenService} method you intend to use. For example
 * [EventListenService.on]{@link EventListenService#on} requires the {@link EventListenOnInterface} interface.
 *
 * There are additional abstract classes available which have implemented the basic types
 * for you. So far we have {@link EventListenerOn}... more to come!
 *
 * @example
 * ```ts
 * // event payload type
 * type MyEventPayload = {id: number, active: boolean};
 *
 * // example event class
 * class MyEvent extends Event<MyEventPayload> {}
 *
 * // example listener class
 * class MyListenOn extends EventListener<MyEvent>
 *   implements EventListenOnInterface
 * {
 *   // default options
 *   options = {};
 *
 *   // custom handler
 *   listen(event: MyEvent): void {
 *     console.log(event.payload);
 *   }
 * }
 *
 * // new listener
 * const myListener = new MyListener();
 *
 * // subscribe to the event
 * EventListenService.on(MyEvent, myListener);
 *
 * // and you can remove the listener easily
 * listener.remove();
 * ```
 */
export abstract class EventListener<E> implements EventListenerInterface<E> {
  /**
   * An instance of the Listener object from EventEmitter2
   */
  private emitterListener: EmitterListener | null = null;

  /**
   * Listen to an event.
   */
  abstract listen(event: EventInstance<E>): EventReturnType<E>;

  /**
   * Called after successful subscription.
   *
   * @internal
   * @param emitterListener - The Listener object returned by EventEmitter2
   */
  subscription(emitterListener: EmitterListener): void {
    // has the emitter listener already been set?
    if (this.emitterListener) {
      // yes, override not allowed
      throw new EventListenerException({
        message: 'Emitter listener can not be overridden once set.',
      });
    }

    // set it
    this.emitterListener = emitterListener;
  }

  /**
   * Remove the subscription.
   */
  remove(): void {
    // has the emitter listener been set?
    if (!this.emitterListener) {
      // no, never subscribed... can't remove
      throw new EventListenerException({
        message: `Can't remove listener, it has not been subscribed.`,
      });
    }

    try {
      // remove the listener
      this.emitterListener.off();
    } catch (_e) {
      throw new EventListenerException({
        message: 'Error occurred while trying to turn listener off()',
      });
    }
  }
}

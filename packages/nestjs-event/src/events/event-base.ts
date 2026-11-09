import { EVENT_MODULE_EVENT_KEY_PREFIX } from '../event-constants';
import { type EventPayload } from '../event-types';

import { type EventBaseInterface } from './interfaces/event-base.interface';

/**
 * Abstract event class.
 *
 * To create a custom event, extend the {@link EventBase} class.
 *
 * You must implement one of the {@link EventInterface} or {@link EventAsyncInterface}
 * interfaces.
 *
 * There are additional abstract classes available which have implemented the
 * event and async event types for your convenience. They are {@link Event}
 * and {@link EventAsync}.
 *
 * @example
 * ```ts
 * // event payload type
 * type MyPayloadType = {id: number, active: boolean};
 *
 * // event class
 * class MyEvent extends EventBase<MyPayloadType>
 *   implements EventInterface<MyPayloadType>
 * {}
 *
 * // create an event
 * const myEvent = new MyEvent({id: 1234, active: true});
 * ```
 */
export abstract class EventBase<
  P = undefined,
  R = P,
> implements EventBaseInterface<P, R> {
  /**
   * Expects return of payload
   *
   * @internal
   */
  readonly expectsReturnOf!: R;

  /**
   * Event key.
   *
   * @returns The event key string.
   */
  static get key(): string {
    return `${EVENT_MODULE_EVENT_KEY_PREFIX}${this.name}`;
  }

  /**
   * Event key.
   *
   * @returns The event key string.
   */
  get key(): string {
    return `${EVENT_MODULE_EVENT_KEY_PREFIX}${this.constructor.name}`;
  }

  /**
   * The payload that was passed to the constructor.
   */
  private _payload: EventPayload<P>;

  /**
   * Constructor
   *
   * @param payload - Payload to emit when the event is dispatched.
   */
  constructor(payload?: EventPayload<P>);

  /**
   * Constructor
   *
   * @param payload - Payload to emit when the event is dispatched.
   */
  constructor(payload: EventPayload<P>) {
    this._payload = payload;
  }

  /**
   * Returns payload that was passed to the Event constructor.
   *
   * @returns The event payload.
   */
  get payload(): EventPayload<P> {
    return this._payload;
  }
}

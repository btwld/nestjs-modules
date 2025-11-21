import { EventAsyncInterface } from './events/interfaces/event-async.interface';
import { EventBaseInterface } from './events/interfaces/event-base.interface';
import { EventExpectsReturnOfInterface } from './events/interfaces/event-expects-return-of.interface';

export type EventPayload<V> = V;

export type EventInstance<E> =
  E extends EventBaseInterface<infer V, infer R>
    ? EventBaseInterface<V, R>
    : never;

export type EventAsyncInstance<E> =
  E extends EventAsyncInterface<infer V, infer R>
    ? EventAsyncInterface<V, R>
    : never;

export type EventReturnType<E> =
  E extends EventExpectsReturnOfInterface<infer R> ? R : never;

export type EventReturnPayload<E, R = EventReturnType<E>> =
  R extends Promise<infer Z> ? Z : R;

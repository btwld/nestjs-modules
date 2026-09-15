import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { type EventBaseInterface } from '../events/interfaces/event-base.interface';

import { EventException } from './event.exception';

/**
 * Thrown when an error is caught when dispatching an {@link Event}.
 */
export class EventDispatchException<P, R> extends EventException {
  context: RuntimeException['context'] & {
    event: EventBaseInterface<P, R>;
  };

  constructor(
    event: EventBaseInterface<P, R>,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Error while trying to dispatch the event with key %s',
      messageParams: [event.key],
      ...options,
    });

    this.context = {
      ...this.context,
      event,
    };

    this.errorCode = 'EVENT_DISPATCH_ERROR';
  }
}

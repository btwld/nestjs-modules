import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { type EventListenOnInterface } from '../services/interfaces/event-listen-on.interface';

import { EventException } from './event.exception';

/**
 * Thrown when an error is caught when listening on an {@link EventListenOn}.
 */
export class EventListenException<E> extends EventException {
  context: RuntimeException['context'] & {
    listener: EventListenOnInterface<E>;
  };

  constructor(
    listener: EventListenOnInterface<E>,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Error while trying to listen on an event',
      ...options,
    });

    this.context = {
      listener,
    };

    this.errorCode = 'EVENT_LISTEN_ERROR';
  }
}

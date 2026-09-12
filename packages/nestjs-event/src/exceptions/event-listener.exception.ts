import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { EventException } from './event.exception';

/**
 * Thrown when an error is caught when subscribing or
 * managing a {@link EventListener} of an {@link Event}.
 */
export class EventListenerException extends EventException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error occurred in event listener',
      ...options,
    });

    this.errorCode = 'EVENT_LISTENER_ERROR';
  }
}

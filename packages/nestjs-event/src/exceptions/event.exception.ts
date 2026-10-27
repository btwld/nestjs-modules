import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';
/**
 * Generic event exception.
 */
export class EventException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'EVENT_ERROR';
  }
}

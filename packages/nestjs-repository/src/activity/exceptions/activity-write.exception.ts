import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a write's activity records could not be stored.
 *
 * The write itself reached the driver first. Inside a transaction the caller
 * opened, this error rolls both back; without one, the write stays stored.
 * Carries the status and fault of a store refusal, such as its row scope's.
 */
export class ActivityWriteException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    storeName: string;
  };

  constructor(
    entityName: string,
    storeName: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Cannot record a write to %s in activity store %s',
      messageParams: [entityName, storeName],
      fault: 'internal',
      ...options,
    });

    this.context = { ...this.context, entityName, storeName };
    this.errorCode = 'ACTIVITY_WRITE_FAILED';
  }
}

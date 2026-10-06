import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

/**
 * Generic federated exception.
 */
export class FileException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'FILE_ERROR';
  }
}

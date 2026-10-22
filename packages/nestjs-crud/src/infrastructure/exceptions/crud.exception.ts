import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';
/**
 * Generic crud exception.
 */
export class CrudException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'CRUD_ERROR';

    this.context = {
      ...this.context,
    };
  }
}

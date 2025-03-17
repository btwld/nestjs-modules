import {
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-exception';
/**
 * Generic crud exception.
 */
export class CrudException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'CRUD_ERROR';
  }
}

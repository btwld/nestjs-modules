import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { CrudException } from './crud.exception.js';

/**
 * Crud context exception.
 */
export class CrudContextException extends CrudException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Error on crud context processing',
      fault: 'internal',
      ...options,
    });
    this.errorCode = 'CRUD_CONTEXT_ERROR';
  }
}

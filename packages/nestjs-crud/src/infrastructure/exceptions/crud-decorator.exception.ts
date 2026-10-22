import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { CrudException } from './crud.exception.js';

export class CrudDecoratorException extends CrudException {
  constructor(options?: RuntimeExceptionOptions) {
    super({ fault: 'usage', ...options });
    this.errorCode = 'CRUD_DECORATOR_ERROR';
  }
}

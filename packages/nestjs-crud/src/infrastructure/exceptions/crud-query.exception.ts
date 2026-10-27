import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { CrudException } from './crud.exception.js';

export class CrudQueryException extends CrudException {
  declare context: RuntimeException['context'] & {
    entityName: string;
  };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to query the %s entity',
      messageParams: [entityName],
      fault: 'internal',
      ...options,
    });

    this.context = {
      ...this.context,
      entityName,
    };

    this.errorCode = 'CRUD_QUERY_ERROR';
  }
}

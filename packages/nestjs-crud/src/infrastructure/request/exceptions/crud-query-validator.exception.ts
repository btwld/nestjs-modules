import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { CrudException } from '../../exceptions/crud.exception.js';

export class CrudQueryValidatorException extends CrudException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });
    this.errorCode = 'CRUD_QUERY_VALIDATOR_ERROR';
  }
}

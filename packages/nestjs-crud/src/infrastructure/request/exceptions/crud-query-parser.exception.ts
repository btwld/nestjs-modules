import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

export class CrudQueryParserException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });
    this.errorCode = 'CRUD_QUERY_PARSER_ERROR';
  }
}

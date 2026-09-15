import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { OrgException } from './org.exception';

export class OrgNotFoundException extends OrgException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'The org was not found',
      httpStatus: HttpStatus.NOT_FOUND,
      ...options,
    });

    this.errorCode = 'ORG_NOT_FOUND_ERROR';
  }
}

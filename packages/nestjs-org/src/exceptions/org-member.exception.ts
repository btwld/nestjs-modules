import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { OrgException } from './org.exception';

export class OrgMemberException extends OrgException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Org member exception',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });
    this.errorCode = 'ORG_MEMBER_ERROR';
  }
}

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

export class OrgException extends RuntimeException {
  constructor(options?: RuntimeExceptionOptions) {
    super(options);
    this.errorCode = 'ORG_ERROR';
  }
}

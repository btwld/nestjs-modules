import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileServiceKeyMissingException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Service key is missing.',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'SERVICE_KEY_MISSING_ERROR';
  }
}

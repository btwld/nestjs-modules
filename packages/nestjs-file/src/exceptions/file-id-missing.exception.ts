import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileIdMissingException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'File id is missing.',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'FILE_ID_MISSING_ERROR';
  }
}

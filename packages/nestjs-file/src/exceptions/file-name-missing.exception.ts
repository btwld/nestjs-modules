import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FilenameMissingException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Filename is missing.',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'FILENAME_MISSING_ERROR';
  }
}

import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileUploadUrlMissingException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error trying to generate signed upload url',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'FILE_UPLOAD_URL_ERROR';
  }
}

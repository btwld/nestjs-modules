import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileDownloadUrlMissingException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error trying to generate signed download url',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'FILE_DOWNLOAD_URL_ERROR';
  }
}

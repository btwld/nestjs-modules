import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from './file.exception.js';

export class FileNotUploadedException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(id: string) {
    super({
      message: 'File %s has not been uploaded',
      messageParams: [id],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
    });

    this.errorCode = 'FILE_NOT_UPLOADED_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}

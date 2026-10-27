import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { FileException } from '../../domain/exceptions/file.exception.js';

export class FileNotFoundException extends FileException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(id: string) {
    super({
      message: 'File not found for id=%s',
      messageParams: [id],
      httpStatus: HttpStatus.NOT_FOUND,
      fault: 'client',
    });

    this.errorCode = 'FILE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}

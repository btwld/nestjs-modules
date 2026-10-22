import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileDuplicateEntryException extends FileException {
  context: RuntimeException['context'] & {
    serviceKey: string;
    fileName: string;
  };

  constructor(
    serviceKey: string,
    fileName: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Duplicate entry detected for service %s with file %s',
      messageParams: [serviceKey, fileName],
      httpStatus: HttpStatus.BAD_REQUEST,
      ...options,
    });

    this.errorCode = 'FILE_DUPLICATE_ENTRY_ERROR';

    this.context = {
      ...this.context,
      serviceKey,
      fileName,
    };
  }
}

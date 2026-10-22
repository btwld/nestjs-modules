import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileCreateException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to create a file',
      ...options,
    });

    this.errorCode = 'FILE_CREATE_ERROR';
  }
}

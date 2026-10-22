import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { FileException } from './file.exception';

export class FileQueryException extends FileException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Error while trying to do a query to file',
      ...options,
    });

    this.errorCode = 'FILE_QUERY_ERROR';
  }
}

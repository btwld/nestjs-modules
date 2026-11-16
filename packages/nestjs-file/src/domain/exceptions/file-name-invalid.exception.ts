import { HttpStatus } from '@nestjs/common';

import { FileException } from './file.exception.js';

/**
 * Thrown when a file name has nothing left once sanitized, such as `..` or a
 * name made only of path separators and invisible characters. The name is
 * left out of the message and context: it is unbounded caller input, made of
 * exactly the characters that don't belong in a log.
 */
export class FileNameInvalidException extends FileException {
  constructor() {
    super({
      message: 'File name has no usable characters',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });

    this.errorCode = 'FILE_NAME_INVALID_ERROR';
  }
}

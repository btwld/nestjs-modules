import { HttpStatus } from '@nestjs/common';

import { FileNameInvalidException } from '../file-name-invalid.exception.js';
import { FileException } from '../file.exception.js';

describe(FileNameInvalidException.name, () => {
  const exception = new FileNameInvalidException();

  it('is a FileException with a bad request status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.errorCode).toBe('FILE_NAME_INVALID_ERROR');
  });

  it('leaves the refused name out of the message', () => {
    expect(exception.message).toBe('File name has no usable characters');
  });
});

import { HttpStatus } from '@nestjs/common';

import { FileAlreadyExistsException } from '../file-already-exists.exception.js';
import { FileException } from '../file.exception.js';

describe(FileAlreadyExistsException.name, () => {
  const exception = new FileAlreadyExistsException({
    serviceKey: 's3',
    fileName: 'docs/a.pdf',
  });

  it('is a FileException with a conflict status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
    expect(exception.errorCode).toBe('FILE_ALREADY_EXISTS_ERROR');
  });

  it('names the file and the storage service', () => {
    expect(exception.message).toBe(
      'A file named docs/a.pdf already exists in storage service s3',
    );
    expect(exception.context).toEqual(
      expect.objectContaining({ serviceKey: 's3', fileName: 'docs/a.pdf' }),
    );
  });
});

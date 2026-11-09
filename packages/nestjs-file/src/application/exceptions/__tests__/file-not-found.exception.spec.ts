import { HttpStatus } from '@nestjs/common';

import { FileException } from '../../../domain/exceptions/file.exception.js';
import { FileNotFoundException } from '../file-not-found.exception.js';

describe(FileNotFoundException.name, () => {
  const exception = new FileNotFoundException('file-1');

  it('is a FileException with a not-found status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.NOT_FOUND);
    expect(exception.errorCode).toBe('FILE_NOT_FOUND_ERROR');
  });

  it('names the file', () => {
    expect(exception.message).toBe('File not found for id=file-1');
    expect(exception.context).toEqual(
      expect.objectContaining({ id: 'file-1' }),
    );
  });
});

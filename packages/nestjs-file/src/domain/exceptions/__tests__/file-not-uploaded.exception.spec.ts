import { HttpStatus } from '@nestjs/common';

import { FileNotUploadedException } from '../file-not-uploaded.exception.js';
import { FileException } from '../file.exception.js';

describe(FileNotUploadedException.name, () => {
  const exception = new FileNotUploadedException('file-1');

  it('is a FileException with a conflict status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
    expect(exception.errorCode).toBe('FILE_NOT_UPLOADED_ERROR');
  });

  it('names the file', () => {
    expect(exception.message).toBe('File file-1 has not been uploaded');
    expect(exception.context).toEqual(
      expect.objectContaining({ id: 'file-1' }),
    );
  });
});

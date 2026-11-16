import { HttpStatus } from '@nestjs/common';

import { FileStatusException } from '../file-status.exception.js';
import { FileException } from '../file.exception.js';

describe(FileStatusException.name, () => {
  const exception = new FileStatusException({
    id: 'file-1',
    status: 'removing',
    action: 'confirm',
  });

  it('is a FileException with a conflict status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.CONFLICT);
    expect(exception.errorCode).toBe('FILE_STATUS_ERROR');
  });

  it('names the action, the file and its status', () => {
    expect(exception.message).toBe(
      'Cannot confirm file file-1 while its status is removing',
    );
    expect(exception.context).toEqual(
      expect.objectContaining({
        id: 'file-1',
        status: 'removing',
        action: 'confirm',
      }),
    );
  });
});

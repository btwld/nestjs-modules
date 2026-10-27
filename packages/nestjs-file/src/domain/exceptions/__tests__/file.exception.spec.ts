import { RuntimeException } from '@concepta/nestjs-core';

import { FileException } from '../file.exception.js';

describe(FileException.name, () => {
  it('is a RuntimeException with the module error code', () => {
    const exception = new FileException();

    expect(exception).toBeInstanceOf(RuntimeException);
    expect(exception.errorCode).toBe('FILE_ERROR');
  });

  it('keeps the message it is given', () => {
    const exception = new FileException({
      message: 'Broken %s',
      messageParams: ['file'],
    });

    expect(exception.message).toBe('Broken file');
  });
});

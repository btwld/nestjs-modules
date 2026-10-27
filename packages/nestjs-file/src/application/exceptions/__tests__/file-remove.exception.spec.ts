import { FileException } from '../../../domain/exceptions/file.exception.js';
import { FileRemoveException } from '../file-remove.exception.js';

describe(FileRemoveException.name, () => {
  const originalError = new Error('denied');

  it('is a FileException that keeps the storage error as the cause', () => {
    const exception = new FileRemoveException({ id: 'file-1', originalError });

    expect(exception).toBeInstanceOf(FileException);
    expect(exception.errorCode).toBe('FILE_REMOVE_ERROR');
    expect(exception.message).toBe(
      'Storage failed to delete the object for file file-1',
    );
    expect(exception.cause).toBe(originalError);
  });

  it('carries no statusError when the failure was recorded', () => {
    const exception = new FileRemoveException({ id: 'file-1', originalError });

    expect(exception.context).toEqual(
      expect.objectContaining({ id: 'file-1' }),
    );
    expect(exception.context).not.toHaveProperty('statusError');
  });

  it('carries the statusError when the failure could not be recorded', () => {
    const statusError = new Error('version moved');

    const exception = new FileRemoveException({
      id: 'file-1',
      originalError,
      statusError,
    });

    expect(exception.context).toHaveProperty('statusError', statusError);
  });
});

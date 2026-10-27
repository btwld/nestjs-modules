import { FileStorageNotFoundException } from '../file-storage-not-found.exception.js';
import { FileException } from '../file.exception.js';

describe(FileStorageNotFoundException.name, () => {
  const exception = new FileStorageNotFoundException('s3');

  it('is a FileException with its error code', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.errorCode).toBe('FILE_STORAGE_NOT_FOUND_ERROR');
  });

  it('names the storage key', () => {
    expect(exception.message).toBe(
      'No storage service is registered for key s3',
    );
    expect(exception.context).toEqual(
      expect.objectContaining({ serviceKey: 's3' }),
    );
  });
});

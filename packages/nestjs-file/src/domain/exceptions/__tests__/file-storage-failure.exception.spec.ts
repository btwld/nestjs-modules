import { FileDownloadUrlException } from '../file-download-url.exception.js';
import { FileExistsCheckException } from '../file-exists-check.exception.js';
import { FileStorageDeleteException } from '../file-storage-delete.exception.js';
import { FileUploadUrlException } from '../file-upload-url.exception.js';
import { FileException } from '../file.exception.js';

const originalError = new Error('s3 down');
const options = { serviceKey: 's3', originalError };

// The four exceptions that wrap a storage service failure share one shape.
describe.each([
  {
    name: FileUploadUrlException.name,
    exception: new FileUploadUrlException(options),
    message: 'Storage service s3 failed to create an upload URL',
    errorCode: 'FILE_UPLOAD_URL_ERROR',
  },
  {
    name: FileDownloadUrlException.name,
    exception: new FileDownloadUrlException(options),
    message: 'Storage service s3 failed to create a download URL',
    errorCode: 'FILE_DOWNLOAD_URL_ERROR',
  },
  {
    name: FileExistsCheckException.name,
    exception: new FileExistsCheckException(options),
    message: 'Storage service s3 failed to check whether a file exists',
    errorCode: 'FILE_EXISTS_CHECK_ERROR',
  },
  {
    name: FileStorageDeleteException.name,
    exception: new FileStorageDeleteException(options),
    message: 'Storage service s3 failed to delete a file',
    errorCode: 'FILE_STORAGE_DELETE_ERROR',
  },
])('$name', ({ exception, message, errorCode }) => {
  it('is a FileException with its error code', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.errorCode).toBe(errorCode);
  });

  it('names the storage service and keeps its error as the cause', () => {
    expect(exception.message).toBe(message);
    expect(exception.cause).toBe(originalError);
    expect(exception.context).toEqual(
      expect.objectContaining({ serviceKey: 's3' }),
    );
  });
});

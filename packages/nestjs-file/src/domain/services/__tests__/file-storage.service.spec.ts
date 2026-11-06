import {
  createMockFile,
  FakeStorageService,
  STORAGE_KEY,
} from '../../../__tests__/helpers/mock.helpers.js';
import { FileDownloadUrlException } from '../../exceptions/file-download-url.exception.js';
import { FileExistsCheckException } from '../../exceptions/file-exists-check.exception.js';
import { FileStorageDeleteException } from '../../exceptions/file-storage-delete.exception.js';
import { FileStorageNotFoundException } from '../../exceptions/file-storage-not-found.exception.js';
import { FileUploadTargetException } from '../../exceptions/file-upload-target.exception.js';
import { FileStorageService } from '../file-storage.service.js';

describe(FileStorageService.name, () => {
  let storage: FakeStorageService;
  let service: FileStorageService;

  beforeEach(() => {
    storage = new FakeStorageService();
    service = new FileStorageService([storage]);
  });

  it('resolves the storage service by key', () => {
    expect(service.resolve(STORAGE_KEY)).toBe(storage);
  });

  it('throws for an unknown key', () => {
    expect(() => service.resolve('nope')).toThrow(FileStorageNotFoundException);
  });

  describe('toCreatedResult', () => {
    it('returns the upload target and download url, passing ctx and the plain file with its size', async () => {
      const file = createMockFile();
      const ctx = {};

      const result = await service.toCreatedResult(ctx, file);

      expect(result).toEqual({
        file,
        upload: {
          url: 'https://upload.test/file-1',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': '1024',
          },
        },
        signedDownloadUrl: 'https://download.test/file-1',
      });
      expect(storage.getUploadTarget).toHaveBeenCalledWith(ctx, file.toPlain());
    });

    it('wraps an async upload target failure', async () => {
      const originalError = new Error('s3 down');
      storage.getUploadTarget.mockRejectedValue(originalError);

      const error = await service
        .toCreatedResult({}, createMockFile())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(FileUploadTargetException);
      expect(error).toHaveProperty('cause', originalError);
    });
  });

  describe('toReadResult', () => {
    it('returns the signed download url and never asks for an upload target', async () => {
      const file = createMockFile({ status: 'active' });

      const result = await service.toReadResult({}, file);

      expect(result).toEqual({
        file,
        signedDownloadUrl: 'https://download.test/file-1',
      });
      expect(storage.getUploadTarget).not.toHaveBeenCalled();
    });

    it('wraps an async download url failure', async () => {
      storage.getSignedDownloadUrl.mockRejectedValue(new Error('s3 down'));

      await expect(service.toReadResult({}, createMockFile())).rejects.toThrow(
        FileDownloadUrlException,
      );
    });
  });

  describe('exists', () => {
    it('asks the storage service', async () => {
      storage.exists?.mockResolvedValue(false);

      expect(await service.exists({}, createMockFile())).toEqual(false);
    });

    it('is true when the storage service has no exists', async () => {
      delete storage.exists;

      expect(await service.exists({}, createMockFile())).toEqual(true);
    });

    it('wraps a failed check', async () => {
      const originalError = new Error('head failed');
      storage.exists?.mockRejectedValue(originalError);

      const error = await service
        .exists({}, createMockFile())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(FileExistsCheckException);
      expect(error).toHaveProperty('cause', originalError);
    });
  });

  describe('delete', () => {
    it('asks the storage service', async () => {
      const file = createMockFile();

      await service.delete({}, file);

      expect(storage.delete).toHaveBeenCalledWith({}, file.toPlain());
    });

    it('does nothing when the storage service has no delete', async () => {
      delete storage.delete;

      await expect(
        service.delete({}, createMockFile()),
      ).resolves.toBeUndefined();
    });

    it('wraps a storage failure', async () => {
      const originalError = new Error('denied');
      storage.delete?.mockRejectedValue(originalError);

      const error = await service
        .delete({}, createMockFile())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(FileStorageDeleteException);
      expect(error).toHaveProperty('cause', originalError);
    });
  });
});

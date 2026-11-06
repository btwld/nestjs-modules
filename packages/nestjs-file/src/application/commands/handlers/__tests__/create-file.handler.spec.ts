import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
  FakeStorageService,
  STORAGE_KEY,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileUploadTargetException } from '../../../../domain/exceptions/file-upload-target.exception.js';
import { FileStorageService } from '../../../../domain/services/file-storage.service.js';
import { CreateFileCommand } from '../../impl/create-file.command.js';
import { CreateFileHandler } from '../create-file.handler.js';

describe(CreateFileHandler.name, () => {
  const dto = {
    serviceKey: STORAGE_KEY,
    fileName: 'docs/a.pdf',
    contentType: 'application/pdf',
    size: 1024,
  };

  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let storage: FakeStorageService;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: CreateFileHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    fileLifecycle.create.mockResolvedValue(createMockFile());
    storage = new FakeStorageService();
    mocks = createMockTransaction();
    handler = new CreateFileHandler(
      fileLifecycle,
      new FileStorageService([storage]),
      createMockEventPublisher(),
      mocks.transaction,
    );
  });

  it('creates the file in a transaction and returns the upload target, never a download url', async () => {
    const result = await handler.execute(new CreateFileCommand({}, dto));

    expect(fileLifecycle.create).toHaveBeenCalledWith(expect.anything(), dto);
    expect(result.file.status).toEqual('pending');
    expect(result.upload.url).toEqual('https://upload.test/file-1');
    expect(result).not.toHaveProperty('signedDownloadUrl');
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('fails inside the transaction when storage cannot make an upload target', async () => {
    storage.getUploadTarget.mockRejectedValue(new Error('s3 down'));

    await expect(
      handler.execute(new CreateFileCommand({}, dto)),
    ).rejects.toThrow(FileUploadTargetException);
    // The file was written in the transaction the failure rolls back.
    expect(fileLifecycle.create).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onCommit).not.toHaveBeenCalled();
  });
});

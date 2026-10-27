import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
  FakeStorageService,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileStorageService } from '../../../../domain/services/file-storage.service.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { ConfirmFileUploadCommand } from '../../impl/confirm-file-upload.command.js';
import { ConfirmFileUploadHandler } from '../confirm-file-upload.handler.js';

describe(ConfirmFileUploadHandler.name, () => {
  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let storage: FakeStorageService;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: ConfirmFileUploadHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    storage = new FakeStorageService();
    mocks = createMockTransaction();
    handler = new ConfirmFileUploadHandler(
      fileLifecycle,
      new FileStorageService([storage]),
      createMockEventPublisher(),
      mocks.transaction,
    );
  });

  it('confirms in a transaction and returns the signed download url only', async () => {
    const confirmed = createMockFile({ status: 'active', version: 2 });
    fileLifecycle.confirmUpload.mockResolvedValue(confirmed);

    const result = await handler.execute(
      new ConfirmFileUploadCommand({}, 'file-1'),
    );

    expect(result).toEqual({
      file: confirmed,
      signedDownloadUrl: 'https://download.test/docs/a.pdf',
    });
    expect(storage.getSignedUploadUrl).not.toHaveBeenCalled();
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('throws when the file does not exist', async () => {
    fileLifecycle.confirmUpload.mockResolvedValue(null);

    await expect(
      handler.execute(new ConfirmFileUploadCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});

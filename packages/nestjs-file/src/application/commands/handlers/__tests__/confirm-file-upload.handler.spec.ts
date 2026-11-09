import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
  FakeScanner,
  FakeStorageService,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileScanRequestException } from '../../../../domain/exceptions/file-scan-request.exception.js';
import { type FileScanRequestInterface } from '../../../../domain/interfaces/file-scan-request.interface.js';
import { FileScanService } from '../../../../domain/services/file-scan.service.js';
import { FileStorageService } from '../../../../domain/services/file-storage.service.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { ConfirmFileUploadCommand } from '../../impl/confirm-file-upload.command.js';
import { ConfirmFileUploadHandler } from '../confirm-file-upload.handler.js';

describe(ConfirmFileUploadHandler.name, () => {
  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let storage: FakeStorageService;
  let scanner: FakeScanner;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: ConfirmFileUploadHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    storage = new FakeStorageService();
    scanner = new FakeScanner();
    mocks = createMockTransaction();
    handler = new ConfirmFileUploadHandler(
      fileLifecycle,
      new FileStorageService([storage]),
      createMockEventPublisher(),
      mocks.transaction,
      new FileScanService(scanner),
    );
  });

  /**
   * Runs what the handler registered to run once its transaction commits.
   */
  async function commit(): Promise<void> {
    for (const [callback] of mocks.trxHandle.onCommit.mock.calls) {
      await callback();
    }
  }

  it('confirms in a transaction and returns the signed download url only', async () => {
    const confirmed = createMockFile({ status: 'active', version: 2 });
    fileLifecycle.confirmUpload.mockResolvedValue({ file: confirmed });

    const result = await handler.execute(
      new ConfirmFileUploadCommand({}, 'file-1'),
    );

    expect(result).toEqual({
      file: confirmed,
      signedDownloadUrl: 'https://download.test/file-1',
    });
    expect(storage.getUploadTarget).not.toHaveBeenCalled();
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('requests the scan only once the confirm commits, and issues no download url', async () => {
    const scanning = createMockFile({ status: 'scanning', version: 2 });
    const scanRequest: FileScanRequestInterface = {
      file: scanning.toPlain(),
      attempt: 1,
    };
    fileLifecycle.confirmUpload.mockResolvedValue({
      file: scanning,
      scanRequest,
    });

    const result = await handler.execute(
      new ConfirmFileUploadCommand({}, 'file-1'),
    );

    expect(result).toEqual({ file: scanning });
    expect(scanner.requestScan).not.toHaveBeenCalled();

    await commit();

    expect(scanner.requestScan).toHaveBeenCalledWith({}, scanRequest);
  });

  it('requests no scan for a file whose upload was already confirmed', async () => {
    fileLifecycle.confirmUpload.mockResolvedValue({
      file: createMockFile({ status: 'scanning' }),
    });

    await handler.execute(new ConfirmFileUploadCommand({}, 'file-1'));
    await commit();

    expect(scanner.requestScan).not.toHaveBeenCalled();
  });

  it('lets a refused scan request reject after the commit, leaving the confirm in place', async () => {
    scanner.requestScan.mockRejectedValue(new Error('queue down'));
    const scanning = createMockFile({ status: 'scanning', version: 2 });
    fileLifecycle.confirmUpload.mockResolvedValue({
      file: scanning,
      scanRequest: { file: scanning.toPlain(), attempt: 1 },
    });

    const result = await handler.execute(
      new ConfirmFileUploadCommand({}, 'file-1'),
    );

    expect(result).toEqual({ file: scanning });
    // The transaction logs a rejected commit callback; the file stays
    // scanning for a sweep.
    await expect(commit()).rejects.toThrow(FileScanRequestException);
  });

  it('throws when the file does not exist', async () => {
    fileLifecycle.confirmUpload.mockResolvedValue(null);

    await expect(
      handler.execute(new ConfirmFileUploadCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});

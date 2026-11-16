import {
  createMockEventPublisher,
  createMockFile,
  createMockFileLifecycle,
  createMockTransaction,
  FakeScanner,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileScanRequestException } from '../../../../domain/exceptions/file-scan-request.exception.js';
import { type FileScanOutcomeInterface } from '../../../../domain/interfaces/file-scan-outcome.interface.js';
import { type FileScanRequestInterface } from '../../../../domain/interfaces/file-scan-request.interface.js';
import { FileScanService } from '../../../../domain/services/file-scan.service.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { FileRejectException } from '../../../exceptions/file-reject.exception.js';
import { FileScanResultInTransactionException } from '../../../exceptions/file-scan-result-in-transaction.exception.js';
import { RecordFileScanResultCommand } from '../../impl/record-file-scan-result.command.js';
import { RecordFileScanResultHandler } from '../record-file-scan-result.handler.js';

describe(RecordFileScanResultHandler.name, () => {
  const infected: FileScanOutcomeInterface = { attempt: 1, result: 'infected' };

  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let scanner: FakeScanner;
  let mocks: ReturnType<typeof createMockTransaction>;
  let handler: RecordFileScanResultHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    scanner = new FakeScanner();
    mocks = createMockTransaction();
    handler = new RecordFileScanResultHandler(
      fileLifecycle,
      createMockEventPublisher(),
      mocks.transaction,
      new FileScanService(scanner),
    );
  });

  it('records a pass in a transaction and returns the active file', async () => {
    const active = createMockFile({ status: 'active', version: 3 });
    fileLifecycle.recordScanResult.mockResolvedValue({ file: active });

    const result = await handler.execute(
      new RecordFileScanResultCommand({}, 'file-1', {
        attempt: 1,
        result: 'clean',
      }),
    );

    expect(result).toBe(active);
    expect(mocks.transaction.run).toHaveBeenCalledTimes(1);
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(fileLifecycle.deleteStoredObject).not.toHaveBeenCalled();
    expect(scanner.requestScan).not.toHaveBeenCalled();
  });

  it('asks for the rescan once the uncertain result has committed', async () => {
    const rescanning = createMockFile({ status: 'rescanning', version: 3 });
    const scanRequest: FileScanRequestInterface = {
      file: rescanning.toPlain(),
      attempt: 2,
    };
    fileLifecycle.recordScanResult.mockResolvedValue({
      file: rescanning,
      scanRequest,
    });

    const result = await handler.execute(
      new RecordFileScanResultCommand({}, 'file-1', {
        attempt: 1,
        result: 'uncertain',
      }),
    );

    expect(result).toBe(rescanning);
    const [record] = fileLifecycle.recordScanResult.mock.invocationCallOrder;
    const [request] = scanner.requestScan.mock.invocationCallOrder;
    expect(record).toBeLessThan(request);
    expect(scanner.requestScan).toHaveBeenCalledWith({}, scanRequest);
  });

  it('throws when the scanner refuses the rescan, leaving the file rescanning', async () => {
    scanner.requestScan.mockRejectedValue(new Error('queue down'));
    const rescanning = createMockFile({ status: 'rescanning', version: 3 });
    fileLifecycle.recordScanResult.mockResolvedValue({
      file: rescanning,
      scanRequest: { file: rescanning.toPlain(), attempt: 2 },
    });

    await expect(
      handler.execute(
        new RecordFileScanResultCommand({}, 'file-1', {
          attempt: 1,
          result: 'uncertain',
        }),
      ),
    ).rejects.toThrow(FileScanRequestException);
  });

  it('commits rejecting, deletes the object outside any transaction, then commits rejected', async () => {
    const rejecting = createMockFile({ status: 'rejecting', version: 3 });
    const rejected = createMockFile({ status: 'rejected', version: 4 });
    fileLifecycle.recordScanResult.mockResolvedValue({ file: rejecting });
    fileLifecycle.finishRejection.mockResolvedValue(rejected);

    const result = await handler.execute(
      new RecordFileScanResultCommand({}, 'file-1', infected),
    );

    expect(result).toBe(rejected);
    const [record] = fileLifecycle.recordScanResult.mock.invocationCallOrder;
    const [objectDelete] =
      fileLifecycle.deleteStoredObject.mock.invocationCallOrder;
    const [finish] = fileLifecycle.finishRejection.mock.invocationCallOrder;
    expect(record).toBeLessThan(objectDelete);
    expect(objectDelete).toBeLessThan(finish);
    expect(mocks.transaction.run).toHaveBeenCalledTimes(2);
    // The object is deleted with the caller's ctx, not inside a transaction.
    expect(fileLifecycle.deleteStoredObject).toHaveBeenCalledWith(
      {},
      rejecting,
    );
    expect(fileLifecycle.finishRejection).toHaveBeenCalledWith(
      expect.anything(),
      rejecting,
    );
  });

  it('leaves the file rejecting and throws when storage fails to delete the object', async () => {
    const originalError = new Error('denied');
    fileLifecycle.recordScanResult.mockResolvedValue({
      file: createMockFile({ status: 'rejecting', version: 3 }),
    });
    fileLifecycle.deleteStoredObject.mockRejectedValue(originalError);

    const error = await handler
      .execute(new RecordFileScanResultCommand({}, 'file-1', infected))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileRejectException);
    expect(error).toHaveProperty('cause', originalError);
    expect(fileLifecycle.finishRejection).not.toHaveBeenCalled();
    // The rejection itself committed, and its event goes out with it.
    expect(mocks.trxHandle.onCommit).toHaveBeenCalledTimes(1);
  });

  it('finishes deleting the object of a file still rejecting from an earlier failure', async () => {
    const rejecting = createMockFile({ status: 'rejecting', version: 3 });
    // The lifecycle returns a file no longer waiting on a scan unchanged.
    fileLifecycle.recordScanResult.mockResolvedValue({ file: rejecting });
    fileLifecycle.finishRejection.mockResolvedValue(
      createMockFile({ status: 'rejected', version: 4 }),
    );

    await handler.execute(
      new RecordFileScanResultCommand({}, 'file-1', infected),
    );

    expect(fileLifecycle.deleteStoredObject).toHaveBeenCalledWith(
      {},
      rejecting,
    );
    expect(fileLifecycle.finishRejection).toHaveBeenCalledTimes(1);
  });

  it('refuses a ctx that already holds a transaction', async () => {
    const txCtx = await mocks.transaction.run({}, async (ctx) => ctx);

    await expect(
      handler.execute(
        new RecordFileScanResultCommand(txCtx, 'file-1', infected),
      ),
    ).rejects.toThrow(FileScanResultInTransactionException);
    expect(fileLifecycle.recordScanResult).not.toHaveBeenCalled();
  });

  it('throws when the file does not exist, before touching storage', async () => {
    fileLifecycle.recordScanResult.mockResolvedValue(null);

    await expect(
      handler.execute(new RecordFileScanResultCommand({}, 'missing', infected)),
    ).rejects.toThrow(FileNotFoundException);
    expect(fileLifecycle.deleteStoredObject).not.toHaveBeenCalled();
  });
});

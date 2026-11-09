import {
  createMockFile,
  createMockFileLifecycle,
  FakeScanner,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { FileScanRequestException } from '../../../../domain/exceptions/file-scan-request.exception.js';
import { type FileScanRequestInterface } from '../../../../domain/interfaces/file-scan-request.interface.js';
import { FileScanService } from '../../../../domain/services/file-scan.service.js';
import { FileNotFoundException } from '../../../exceptions/file-not-found.exception.js';
import { RequestFileScanCommand } from '../../impl/request-file-scan.command.js';
import { RequestFileScanHandler } from '../request-file-scan.handler.js';

describe(RequestFileScanHandler.name, () => {
  let fileLifecycle: ReturnType<typeof createMockFileLifecycle>;
  let scanner: FakeScanner;
  let handler: RequestFileScanHandler;

  beforeEach(() => {
    fileLifecycle = createMockFileLifecycle();
    scanner = new FakeScanner();
    handler = new RequestFileScanHandler(
      fileLifecycle,
      new FileScanService(scanner),
    );
  });

  it('sends the request the file is waiting on and returns the file', async () => {
    const rescanning = createMockFile({ status: 'rescanning' });
    const scanRequest: FileScanRequestInterface = {
      file: rescanning.toPlain(),
      attempt: 2,
    };
    fileLifecycle.getScanStep.mockResolvedValue({
      file: rescanning,
      scanRequest,
    });

    const result = await handler.execute(
      new RequestFileScanCommand({}, 'file-1'),
    );

    expect(result).toBe(rescanning);
    expect(fileLifecycle.getScanStep).toHaveBeenCalledWith({}, 'file-1');
    expect(scanner.requestScan).toHaveBeenCalledWith({}, scanRequest);
  });

  it('sends nothing for a file no longer waiting on a scan', async () => {
    const active = createMockFile({ status: 'active' });
    fileLifecycle.getScanStep.mockResolvedValue({ file: active });

    expect(
      await handler.execute(new RequestFileScanCommand({}, 'file-1')),
    ).toBe(active);
    expect(scanner.requestScan).not.toHaveBeenCalled();
  });

  it('throws when the scanner refuses the request', async () => {
    scanner.requestScan.mockRejectedValue(new Error('queue down'));
    const scanning = createMockFile({ status: 'scanning' });
    fileLifecycle.getScanStep.mockResolvedValue({
      file: scanning,
      scanRequest: { file: scanning.toPlain(), attempt: 1 },
    });

    await expect(
      handler.execute(new RequestFileScanCommand({}, 'file-1')),
    ).rejects.toThrow(FileScanRequestException);
  });

  it('sends nothing without a scanner', async () => {
    const scanning = createMockFile({ status: 'scanning' });
    fileLifecycle.getScanStep.mockResolvedValue({
      file: scanning,
      scanRequest: { file: scanning.toPlain(), attempt: 1 },
    });

    const unscanned = new RequestFileScanHandler(fileLifecycle);

    expect(
      await unscanned.execute(new RequestFileScanCommand({}, 'file-1')),
    ).toBe(scanning);
    expect(scanner.requestScan).not.toHaveBeenCalled();
  });

  it('throws when the file does not exist', async () => {
    fileLifecycle.getScanStep.mockResolvedValue(null);

    await expect(
      handler.execute(new RequestFileScanCommand({}, 'missing')),
    ).rejects.toThrow(FileNotFoundException);
  });
});

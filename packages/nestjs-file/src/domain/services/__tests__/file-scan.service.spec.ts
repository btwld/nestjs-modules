import {
  createMockFile,
  FakeScanner,
} from '../../../__tests__/helpers/mock.helpers.js';
import { FileScanRequestException } from '../../exceptions/file-scan-request.exception.js';
import { type FileScanRequestInterface } from '../../interfaces/file-scan-request.interface.js';
import { FileScanService } from '../file-scan.service.js';

describe(FileScanService.name, () => {
  const request: FileScanRequestInterface = {
    file: createMockFile({ status: 'scanning' }).toPlain(),
    attempt: 1,
  };

  it('is enabled with a scanner and sends it the request with ctx', async () => {
    const scanner = new FakeScanner();
    const service = new FileScanService(scanner);
    const ctx = {};

    await service.request(ctx, request);

    expect(service.isEnabled).toEqual(true);
    expect(scanner.requestScan).toHaveBeenCalledWith(ctx, request);
  });

  it('is disabled, and sends nothing, without a scanner', async () => {
    const service = new FileScanService();

    await service.request({}, request);

    expect(service.isEnabled).toEqual(false);
  });

  it('wraps a refused request, keeping the scanner error as the cause', async () => {
    const originalError = new Error('queue down');
    const scanner = new FakeScanner();
    scanner.requestScan.mockRejectedValue(originalError);

    const error = await new FileScanService(scanner)
      .request({}, request)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileScanRequestException);
    expect(error).toHaveProperty('cause', originalError);
    expect(error).toHaveProperty('context.id', 'file-1');
  });
});

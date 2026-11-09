import { Injectable, type PlainLiteralObject } from '@nestjs/common';

import { FileScanRequestException } from '../exceptions/file-scan-request.exception.js';
import { type FileScanRequestInterface } from '../interfaces/file-scan-request.interface.js';
import { type FileScanServiceInterface } from '../interfaces/file-scan-service.interface.js';

/**
 * Sends scan requests to the module's `scanner`, when one is registered.
 */
@Injectable()
export class FileScanService {
  constructor(private readonly scanner?: FileScanServiceInterface) {}

  /**
   * Whether confirmed uploads are held for a scan.
   */
  get isEnabled(): boolean {
    return this.scanner !== undefined;
  }

  /**
   * Sends the request. A failure throws `FileScanRequestException`, with the
   * scanner's error as its `cause`. Does nothing without a scanner.
   */
  async request(
    ctx: PlainLiteralObject,
    request: FileScanRequestInterface,
  ): Promise<void> {
    if (!this.scanner) {
      return;
    }

    try {
      await this.scanner.requestScan(ctx, request);
    } catch (originalError) {
      throw new FileScanRequestException({
        id: request.file.id,
        originalError,
      });
    }
  }
}

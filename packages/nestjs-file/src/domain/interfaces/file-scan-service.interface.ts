import { type PlainLiteralObject } from '@nestjs/common';

import { type FileScanRequestInterface } from './file-scan-request.interface.js';

/**
 * Checks uploaded files for malware and unsafe content. Register one as the
 * module's `scanner`: every confirmed upload is then held until it passes.
 *
 * The scanner owns the bytes: report `clean` only when the bytes downloads
 * will serve are the bytes you scanned, and the uploader can no longer
 * change them. An upload target may still be valid after confirm, so never
 * pass a file whose served bytes the uploader can still write. Move or copy
 * the object out of the uploader's reach, pin the version you scanned, or
 * make uploads impossible to overwrite: whichever your storage supports.
 */
export interface FileScanServiceInterface {
  /**
   * Starts a scan of the request's file and returns without waiting for it.
   * Report the result by dispatching `RecordFileScanResultCommand` with the
   * request's `attempt`.
   */
  requestScan(
    ctx: PlainLiteralObject,
    request: FileScanRequestInterface,
  ): Promise<void> | void;
}

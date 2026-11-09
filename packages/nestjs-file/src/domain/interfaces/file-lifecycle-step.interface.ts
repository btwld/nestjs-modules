import { type File } from '../aggregates/file.js';

import { type FileScanRequestInterface } from './file-scan-request.interface.js';

/**
 * A file as stored after a lifecycle step, and the scan the step started,
 * if any. Send `scanRequest` to the scanner once the step commits.
 */
export interface FileLifecycleStepInterface {
  file: File;
  scanRequest?: FileScanRequestInterface;
}

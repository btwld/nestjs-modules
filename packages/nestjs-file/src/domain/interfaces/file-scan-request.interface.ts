import { type FileObjectInterface } from './file-object.interface.js';
import { type FileScanAttempt } from './file-scan-attempt.type.js';

/**
 * A request to scan a file's stored object. Hand `attempt` back with the
 * result, so a late or repeated result for an earlier attempt is ignored.
 */
export interface FileScanRequestInterface {
  file: FileObjectInterface;
  attempt: FileScanAttempt;
}

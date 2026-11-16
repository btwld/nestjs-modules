import { type FileScanAttempt } from './file-scan-attempt.type.js';
import { type FileScanResult } from './file-scan-result.type.js';

/**
 * The result of one scan, as the scanner reports it.
 */
export interface FileScanOutcomeInterface {
  /**
   * The attempt from the scan request this result answers.
   */
  attempt: FileScanAttempt;

  result: FileScanResult;
}

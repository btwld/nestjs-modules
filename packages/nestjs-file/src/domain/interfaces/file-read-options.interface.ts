import { type FileStatus } from './file-status.type.js';

export interface FileReadOptionsInterface {
  /**
   * Only match files in one of these statuses. Matches every status when
   * omitted.
   */
  status?: FileStatus[];
}

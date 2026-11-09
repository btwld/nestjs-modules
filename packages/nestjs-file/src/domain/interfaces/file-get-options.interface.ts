import { type FileReadOptionsInterface } from './file-read-options.interface.js';

export interface FileGetOptionsInterface extends FileReadOptionsInterface {
  /**
   * Also match soft-deleted files.
   */
  withDeleted?: boolean;
}

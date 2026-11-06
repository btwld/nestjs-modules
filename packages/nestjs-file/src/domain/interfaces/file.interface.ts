import { type FileStatus } from './file-status.type.js';

export interface FileInterface {
  /**
   * Key of the storage service that holds the file.
   */
  serviceKey: string;

  /**
   * Display name, sanitized at create (see the README's Commands section).
   * Never a storage key; several files may share one.
   */
  fileName: string;

  /**
   * MIME type of the file.
   */
  contentType: string;

  status: FileStatus;
}

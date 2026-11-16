import { type File } from '../aggregates/file.js';

/**
 * Returned by `ConfirmFileUploadCommand` and `GetFileDownloadQuery`.
 */
export interface FileReadResultInterface {
  /**
   * The stored file row: id, serviceKey, fileName, contentType, size,
   * status, version, dates.
   */
  file: File;

  /**
   * Signed, expiring URL the client GETs the file's bytes from. Set only
   * when the file is `active` and not soft-deleted.
   */
  signedDownloadUrl?: string;
}

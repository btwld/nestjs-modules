import { type File } from '../aggregates/file.js';

/**
 * Returned by `ConfirmFileUploadCommand` and `GetFileQuery`.
 */
export interface FileReadResultInterface {
  /**
   * The stored file row: id, serviceKey, fileName, contentType, status,
   * version, dates.
   */
  file: File;

  /**
   * Signed, expiring URL the client GETs the file's bytes from.
   */
  signedDownloadUrl: string;
}

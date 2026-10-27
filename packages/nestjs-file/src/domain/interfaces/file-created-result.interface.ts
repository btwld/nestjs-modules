import { type File } from '../aggregates/file.js';

/**
 * Returned by `CreateFileCommand`.
 */
export interface FileCreatedResultInterface {
  /**
   * The stored file row: id, serviceKey, fileName, contentType, status
   * (`pending`), version, dates.
   */
  file: File;

  /**
   * Signed, expiring URL the client PUTs the file's bytes to. Issued only at
   * create.
   */
  signedUploadUrl: string;

  /**
   * Signed, expiring URL the client GETs the file's bytes from.
   */
  signedDownloadUrl: string;
}

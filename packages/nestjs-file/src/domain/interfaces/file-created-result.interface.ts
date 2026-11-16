import { type File } from '../aggregates/file.js';

import { type FileUploadTargetInterface } from './file-upload-target.interface.js';

/**
 * Returned by `CreateFileCommand`.
 */
export interface FileCreatedResultInterface {
  /**
   * The stored file row: id, serviceKey, fileName, contentType, size,
   * status (`pending`), version, dates.
   */
  file: File;

  /**
   * Where and how the client uploads the file's bytes. Issued only at
   * create.
   */
  upload: FileUploadTargetInterface;
}

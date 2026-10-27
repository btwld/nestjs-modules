import { type FileStatus } from './file-status.type.js';

export interface FileInterface {
  /**
   * Key of the storage service that holds the file.
   */
  serviceKey: string;

  /**
   * File name, including any path. Unique per storage service.
   */
  fileName: string;

  /**
   * MIME type of the file.
   */
  contentType: string;

  status: FileStatus;
}

import { type PlainLiteralObject } from '@nestjs/common';

import { type FileObjectInterface } from './file-object.interface.js';
import { type FileStorageServiceInterface } from './file-storage-service.interface.js';

/**
 * A storage service for a module with a scanner, which must be able to
 * delete a rejected file's object.
 */
export interface FileScannedStorageServiceInterface extends FileStorageServiceInterface {
  /**
   * Delete the stored object, every copy of it. Must be idempotent: resolve
   * when the object is already gone.
   */
  delete(
    ctx: PlainLiteralObject,
    file: FileObjectInterface,
  ): Promise<void> | void;
}

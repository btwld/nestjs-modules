import { type FileScanServiceInterface } from '../../../domain/interfaces/file-scan-service.interface.js';
import { type FileScannedStorageServiceInterface } from '../../../domain/interfaces/file-scanned-storage-service.interface.js';
import { type FileUploadPolicySettings } from '../../../domain/policies/file-upload.policy.js';

import { type FileOptionsBaseInterface } from './file-options-base.interface.js';

/**
 * A file module with a scanner: every confirmed upload is held until it
 * passes, and a rejected one's object is deleted, so every storage service
 * must implement `delete`. The type system enforces this; the module
 * doesn't check it again at runtime.
 */
export interface FileScannedOptionsInterface extends FileOptionsBaseInterface {
  /**
   * One storage service per `KEY`, each able to delete objects. A file whose
   * `serviceKey` matches no service cannot be created.
   */
  storageServices: FileScannedStorageServiceInterface[];

  /**
   * What a new file may be. Without it, any type, extension and size is
   * allowed.
   */
  uploadPolicy?: FileUploadPolicySettings;

  /**
   * Checks every confirmed upload. Nothing bypasses it: a file becomes
   * `active` only by passing a scan.
   */
  scanner: FileScanServiceInterface;
}

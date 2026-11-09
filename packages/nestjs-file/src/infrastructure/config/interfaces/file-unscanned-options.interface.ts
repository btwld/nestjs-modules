import { type FileStorageServiceInterface } from '../../../domain/interfaces/file-storage-service.interface.js';
import { type FileUploadPolicySettings } from '../../../domain/policies/file-upload.policy.js';

import { type FileOptionsBaseInterface } from './file-options-base.interface.js';

/**
 * A file module without a scanner: a confirmed upload is `active` at once,
 * so the upload policy can't require a scan.
 */
export interface FileUnscannedOptionsInterface extends FileOptionsBaseInterface {
  /**
   * One storage service per `KEY`. A file whose `serviceKey` matches no
   * service cannot be created.
   */
  storageServices: FileStorageServiceInterface[];

  /**
   * What a new file may be. Without it, any type, extension and size is
   * allowed.
   */
  uploadPolicy?: FileUploadPolicySettings & { requireScan?: false };

  scanner?: undefined;
}

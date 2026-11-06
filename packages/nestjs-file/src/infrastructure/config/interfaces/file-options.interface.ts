import { type FileStorageServiceInterface } from '../../../domain/interfaces/file-storage-service.interface.js';
import { type FileUploadPolicyInterface } from '../../../domain/interfaces/file-upload-policy.interface.js';

import { type FileSettingsInterface } from './file-settings.interface.js';

export interface FileOptionsInterface {
  /**
   * One storage service per `KEY`. A file whose `serviceKey` matches no
   * service cannot be created.
   */
  storageServices: FileStorageServiceInterface[];

  /**
   * What a new file may be. Without it, any type, extension and size is
   * allowed.
   */
  uploadPolicy?: FileUploadPolicyInterface;

  settings?: FileSettingsInterface;
}

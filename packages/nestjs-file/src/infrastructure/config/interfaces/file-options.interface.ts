import { type FileStorageServiceInterface } from '../../../domain/interfaces/file-storage-service.interface.js';

import { type FileSettingsInterface } from './file-settings.interface.js';

export interface FileOptionsInterface {
  /**
   * One storage service per `KEY`. A file whose `serviceKey` matches no
   * service cannot be created.
   */
  storageServices: FileStorageServiceInterface[];
  settings?: FileSettingsInterface;
}

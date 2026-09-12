import { type FileSettingsInterface } from './file-settings.interface';
import { type FileStorageServiceInterface } from './file-storage-service.interface';

export interface FileOptionsInterface {
  storageServices?: FileStorageServiceInterface[];
  settings?: FileSettingsInterface;
}

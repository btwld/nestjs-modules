import { type FileCreatableInterface } from '@concepta/nestjs-common';

import { type FileStorageServiceInterface } from './file-storage-service.interface';

export interface FileStrategyServiceInterface {
  getUploadUrl(file: FileCreatableInterface): Promise<string>;
  getDownloadUrl(file: FileCreatableInterface): Promise<string>;
  resolveStorageService(
    file: FileCreatableInterface,
  ): FileStorageServiceInterface;
}

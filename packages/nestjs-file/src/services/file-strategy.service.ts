import { FileCreatableInterface } from '@concepta/nestjs-common';
import { FileStrategyServiceInterface } from '../interfaces/file-strategy-service.interface';
import { FileStorageServiceInterface } from '../interfaces/file-storage-service.interface';
import { FileStorageServiceNotFoundException } from '../exceptions/file-storage-service-not-found.exception';
import { FileDownloadUrlMissingException } from '../exceptions/file-download-url-missing.exception';

export class FileStrategyService implements FileStrategyServiceInterface {
  private readonly storageServices: FileStorageServiceInterface[] = [];

  public addStorageService(storageService: FileStorageServiceInterface): void {
    this.storageServices.push(storageService);
  }

  async getUploadUrl(file: FileCreatableInterface): Promise<string> {
    try {
      return this.resolveStorageService(file).getUploadUrl(file);
    } catch (err) {
      throw new FileDownloadUrlMissingException({
        originalError: err,
      });
    }
  }

  async getDownloadUrl(file: FileCreatableInterface): Promise<string> {
    try {
      return this.resolveStorageService(file).getDownloadUrl(file);
    } catch (err) {
      throw new FileDownloadUrlMissingException({
        originalError: err,
      });
    }
  }

  resolveStorageService(
    file: FileCreatableInterface,
  ): FileStorageServiceInterface {
    const storageService = this.storageServices.find((storageService) => {
      return storageService.KEY === file.serviceKey;
    });

    if (storageService) {
      return storageService;
    }

    throw new FileStorageServiceNotFoundException(file.serviceKey);
  }
}

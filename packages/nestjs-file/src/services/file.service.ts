import { Inject, Injectable } from '@nestjs/common';

import {
  FileCreatableInterface,
  FileInterface,
  ReferenceIdInterface,
} from '@concepta/nestjs-common';

import { FileCreateException } from '../exceptions/file-create.exception';
import { FileDuplicateEntryException } from '../exceptions/file-duplicated.exception';
import { FileIdMissingException } from '../exceptions/file-id-missing.exception';
import { FileQueryException } from '../exceptions/file-query.exception';
import { FILE_STRATEGY_SERVICE_KEY } from '../file.constants';
import { FileModelServiceInterface } from '../interfaces/file-model-service.interface';
import { FileServiceInterface } from '../interfaces/file-service.interface';
import { FileStrategyServiceInterface } from '../interfaces/file-strategy-service.interface';

import { FileModelService } from './file-model.service';

@Injectable()
export class FileService implements FileServiceInterface {
  constructor(
    @Inject(FILE_STRATEGY_SERVICE_KEY)
    private fileStrategyService: FileStrategyServiceInterface,
    @Inject(FileModelService)
    private fileModelService: FileModelServiceInterface,
  ) {}

  async push(file: FileCreatableInterface): Promise<FileInterface> {
    await this.checkExistingFile(file);
    try {
      const newFile = await this.fileModelService.create(file);
      return this.addFileUrls(newFile);
    } catch (err) {
      throw new FileCreateException({ originalError: err });
    }
  }

  async fetch(file: ReferenceIdInterface): Promise<FileInterface> {
    if (!file.id) throw new FileIdMissingException();
    const dbFile = await this.fileModelService.byId(file.id);
    if (!dbFile) throw new FileQueryException();
    return this.addFileUrls(dbFile);
  }

  protected async checkExistingFile(
    file: FileCreatableInterface,
  ): Promise<void> {
    const existingFile = await this.fileModelService.getUniqueFile(file);
    if (existingFile) {
      throw new FileDuplicateEntryException(file.serviceKey, file.fileName);
    }
  }

  private async addFileUrls(file: FileInterface): Promise<FileInterface> {
    try {
      file.uploadUri = await this.fileStrategyService.getUploadUrl(file);
    } catch (_err) {
      file.uploadUri = '';
    }
    try {
      file.downloadUrl = await this.fileStrategyService.getDownloadUrl(file);
    } catch (_err) {
      file.downloadUrl = '';
    }
    return file;
  }
}

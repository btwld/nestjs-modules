import { type FileCreatableInterface } from '@concepta/nestjs-common';

import { type FileStorageServiceInterface } from '../interfaces/file-storage-service.interface';

import {
  AWS_KEY_FIXTURE,
  DOWNLOAD_URL_FIXTURE,
  UPLOAD_URL_FIXTURE,
} from './constants.fixture';

export class AwsStorageService implements FileStorageServiceInterface {
  KEY: string = AWS_KEY_FIXTURE;

  getUploadUrl(_file: FileCreatableInterface): string {
    return UPLOAD_URL_FIXTURE;
  }

  getDownloadUrl(_file: FileCreatableInterface): string {
    // make a call to aws to get signed download url
    return DOWNLOAD_URL_FIXTURE;
  }
}

import {
  type FileCreatableInterface,
  type FileInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface FileServiceInterface {
  push(file: FileCreatableInterface): Promise<FileInterface>;
  fetch(file: ReferenceIdInterface): Promise<FileInterface>;
}

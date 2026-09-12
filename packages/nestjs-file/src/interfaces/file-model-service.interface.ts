import {
  type ByIdInterface,
  type FileCreatableInterface,
  type ReferenceId,
  type CreateOneInterface,
  type FileEntityInterface,
} from '@concepta/nestjs-common';

export interface FileModelServiceInterface
  extends
    ByIdInterface<ReferenceId, FileEntityInterface>,
    CreateOneInterface<FileCreatableInterface, FileEntityInterface> {
  getUniqueFile(
    org: Pick<FileCreatableInterface, 'serviceKey' | 'fileName'>,
  ): Promise<FileEntityInterface | null>;
}

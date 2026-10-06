import { type FileCreatableInterface } from './file-creatable.interface';
import { type FileInterface } from './file.interface';

export interface FileUpdatableInterface
  extends Pick<FileInterface, 'id'>, FileCreatableInterface {}

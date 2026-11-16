import { type FileInterface } from './file.interface';

export interface FileCreatableInterface extends Pick<
  FileInterface,
  'serviceKey' | 'fileName' | 'contentType'
> {}

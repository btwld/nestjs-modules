import { type FileInterface } from './file.interface.js';

export interface FileCreatableInterface extends Pick<
  FileInterface,
  'serviceKey' | 'fileName' | 'contentType'
> {}

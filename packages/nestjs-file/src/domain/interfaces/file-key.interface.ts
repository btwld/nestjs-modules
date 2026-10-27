import { type FileInterface } from './file.interface.js';

/**
 * The columns that identify a file within its storage service.
 */
export interface FileKeyInterface extends Pick<
  FileInterface,
  'serviceKey' | 'fileName'
> {}

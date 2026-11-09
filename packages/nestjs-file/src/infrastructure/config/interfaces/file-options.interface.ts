import { type FileScannedOptionsInterface } from './file-scanned-options.interface.js';
import { type FileUnscannedOptionsInterface } from './file-unscanned-options.interface.js';

/**
 * The file module's options: with a `scanner`, every storage service must
 * implement `delete`.
 */
export type FileOptionsInterface =
  FileUnscannedOptionsInterface | FileScannedOptionsInterface;

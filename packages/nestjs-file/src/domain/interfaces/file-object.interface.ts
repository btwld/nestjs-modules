import { type ReferenceIdInterface } from '@concepta/nestjs-core';

import { type FileInterface } from './file.interface.js';

/**
 * A file as a storage service sees it. Key the stored object by `id`, never
 * by `fileName`.
 */
export interface FileObjectInterface
  extends ReferenceIdInterface, FileInterface {}

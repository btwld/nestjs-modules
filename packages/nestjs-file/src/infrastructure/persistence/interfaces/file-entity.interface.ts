import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type FileInterface } from '../../../domain/interfaces/file.interface.js';

export interface FileEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    FileInterface,
    AuditInterface {}

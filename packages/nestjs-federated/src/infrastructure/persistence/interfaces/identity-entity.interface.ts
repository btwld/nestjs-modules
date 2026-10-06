import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type IdentityInterface } from '../../../domain/interfaces/identity.interface.js';

export interface IdentityEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    IdentityInterface,
    AuditInterface {}

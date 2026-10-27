import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type UserCredentialInterface } from './user-credential.interface.js';

export interface UserCredentialEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    UserCredentialInterface,
    AuditInterface {}

import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type UserInterface } from './user.interface.js';

export interface UserEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    UserInterface,
    AuditInterface {}

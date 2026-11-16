import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type RoleInterface } from './role.interface.js';

export interface RoleEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    RoleInterface,
    AuditInterface {}

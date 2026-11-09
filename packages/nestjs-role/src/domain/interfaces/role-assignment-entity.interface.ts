import {
  type AuditInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type RoleAssignmentInterface } from './role-assignment.interface.js';

export interface RoleAssignmentEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    RoleAssignmentInterface,
    AuditInterface {}

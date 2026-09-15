import {
  type AuditInterface,
  type ReferenceActiveInterface,
  type ReferenceIdInterface,
  type ReferenceVersionInterface,
} from '@concepta/nestjs-core';

import { type InvitationInterface } from '../../../domain/interfaces/invitation.interface.js';

export interface InvitationEntityInterface
  extends
    ReferenceIdInterface,
    ReferenceVersionInterface,
    ReferenceActiveInterface,
    InvitationInterface,
    AuditInterface {}

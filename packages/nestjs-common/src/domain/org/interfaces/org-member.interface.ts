import { type AuditInterface } from '../../../audit/interfaces/audit.interface';
import { type ReferenceActiveInterface } from '../../../reference/interfaces/reference-active.interface';
import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type ReferenceId } from '../../../reference/interfaces/reference.types';

import { type OrgOwnableInterface } from './org-ownable.interface';

export interface OrgMemberOwnableInterface {
  userId: ReferenceId;
}

export interface OrgMemberInterface
  extends
    ReferenceIdInterface,
    ReferenceActiveInterface,
    OrgOwnableInterface,
    OrgMemberOwnableInterface,
    AuditInterface {}

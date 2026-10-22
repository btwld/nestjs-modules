import { type AuditInterface } from '../../../audit/interfaces/audit.interface';
import { type ReferenceActiveInterface } from '../../../reference/interfaces/reference-active.interface';
import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type OrgProfileInterface } from '../../org-profile/interfaces/org-profile.interface';

import { type OrgOwnerInterface } from './org-owner.interface';

export interface OrgInterface
  extends
    ReferenceIdInterface,
    ReferenceActiveInterface,
    AuditInterface,
    OrgOwnerInterface {
  /**
   * Name
   */
  name: string;
  orgProfile?: OrgProfileInterface;
}

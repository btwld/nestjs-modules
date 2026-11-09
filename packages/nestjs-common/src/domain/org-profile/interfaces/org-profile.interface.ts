import { type AuditInterface } from '../../../audit/interfaces/audit.interface';
import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type OrgOwnableInterface } from '../../org/interfaces/org-ownable.interface';

export interface OrgProfileInterface
  extends ReferenceIdInterface, AuditInterface, OrgOwnableInterface {}

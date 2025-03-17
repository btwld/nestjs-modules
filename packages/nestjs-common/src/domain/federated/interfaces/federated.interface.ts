import { AuditInterface } from '../../../audit/interfaces/audit.interface';
import { ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { ReferenceUserInterface } from '../../../reference/interfaces/reference-user.interface';

export interface FederatedInterface
  extends ReferenceIdInterface,
    ReferenceUserInterface<ReferenceIdInterface>,
    AuditInterface {
  /**
   * Provider name (github, facebook, etc)
   */
  provider: string;

  /**
   * The reference identification for provider
   *
   * TODO: rename to `sub` via ReferenceSubjectInterface
   */
  subject: string;

  /**
   * The user federated will be associated to
   */
  user: ReferenceIdInterface;
}

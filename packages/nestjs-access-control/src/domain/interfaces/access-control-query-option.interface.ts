import { type Type } from '@nestjs/common';

import { type CanAccess } from '../policies/can-access.policy.js';

export interface AccessControlQueryOptionInterface {
  /**
   * Service used for advanced validation
   */
  service: Type<CanAccess>;
}

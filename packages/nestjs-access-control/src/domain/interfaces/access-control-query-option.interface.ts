import { type Type } from '@nestjs/common';

import { type CanAccess } from './can-access.interface.js';

export interface AccessControlQueryOptionInterface {
  /**
   * The access query service that decides the route.
   */
  service: Type<CanAccess>;
}

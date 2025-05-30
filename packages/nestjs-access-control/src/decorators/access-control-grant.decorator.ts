import { SetMetadata } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../constants';
import { AccessControlGrantOptionInterface } from '../interfaces/access-control-grant-option.interface';

/**
 * Define access control grants required for this route.
 *
 * @param acGrants - Array of access control grants.
 * @returns Decorator function.
 */
export const AccessControlGrant = (
  ...acGrants: AccessControlGrantOptionInterface[]
): ReturnType<typeof SetMetadata> => {
  return SetMetadata(ACCESS_CONTROL_MODULE_GRANT_METADATA, acGrants);
};

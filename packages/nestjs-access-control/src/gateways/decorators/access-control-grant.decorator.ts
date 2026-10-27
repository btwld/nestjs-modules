import { SetMetadata } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../access-control.constants.js';
import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';

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

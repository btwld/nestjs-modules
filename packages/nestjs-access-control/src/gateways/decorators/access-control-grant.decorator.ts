import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_GRANT_METADATA } from '../../access-control.constants.js';
import { AccessControlException } from '../../domain/exceptions/access-control.exception.js';
import { type AccessControlGrantOptionInterface } from '../../domain/interfaces/access-control-grant-option.interface.js';
import { AccessControlGuard } from '../http/access-control.guard.js';

/**
 * The grants a route requires; the first the actor holds lets the call
 * through, checking `any` before `own`. On a controller, every route in it
 * requires them, unless a route declares its own.
 *
 * Applies `AccessControlGuard`, which runs after every global guard and
 * before every interceptor.
 *
 * @param acGrants - Array of access control grants; at least one.
 * @returns Decorator function.
 */
export const AccessControlGrant = (
  ...acGrants: AccessControlGrantOptionInterface[]
): ReturnType<typeof applyDecorators> => {
  if (!acGrants.length) {
    throw new AccessControlException({
      message: '@AccessControlGrant needs at least one grant',
      fault: 'usage',
    });
  }

  return applyDecorators(
    SetMetadata(ACCESS_CONTROL_MODULE_GRANT_METADATA, acGrants),
    UseGuards(AccessControlGuard),
  );
};

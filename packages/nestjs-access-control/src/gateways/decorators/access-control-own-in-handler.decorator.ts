import { SetMetadata } from '@nestjs/common';

import { ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA } from '../../access-control.constants.js';

/**
 * Declares that the route's handler limits a caller let in on `own` to
 * their own records, such as a list returning only the caller's rows when
 * `AccessControlService.decision` says `own`. Without it, or an
 * `@AccessControlQuery`, a call let in on `own` is refused: nothing would
 * check the records are theirs.
 *
 * Prefer it on the method. On a controller, it covers the routes that use
 * the controller's grant, not a route that declares its own.
 */
export const AccessControlOwnInHandler = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ACCESS_CONTROL_MODULE_OWN_IN_HANDLER_METADATA, true);

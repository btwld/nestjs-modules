import { AccessControlUpdateOne } from './access-control-update-one.decorator.js';

/**
 * Recover one resource grant shortcut. Recovering is an update, as CRUD's
 * restore is.
 *
 * @param resource - The grant resource.
 */
export const AccessControlRecoverOne = (resource: string) =>
  AccessControlUpdateOne(resource);

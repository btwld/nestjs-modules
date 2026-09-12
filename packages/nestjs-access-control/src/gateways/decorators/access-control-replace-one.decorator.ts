import { AccessControlUpdateOne } from './access-control-update-one.decorator.js';

/**
 * Update one resource grant shortcut.
 *
 * @param resource - The grant resource.
 */
export const AccessControlReplaceOne = (resource: string) =>
  AccessControlUpdateOne(resource);

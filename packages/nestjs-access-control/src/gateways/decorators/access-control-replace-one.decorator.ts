import { AccessControlUpdateOne } from './access-control-update-one.decorator.js';

/**
 * Replace one resource grant shortcut: a replace is an update.
 *
 * @param resource - The grant resource.
 */
export const AccessControlReplaceOne = (resource: string) =>
  AccessControlUpdateOne(resource);

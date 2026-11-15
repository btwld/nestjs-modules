/**
 * The actions a repository asks its authority. A route may ask its own,
 * such as `approve`.
 */
export enum ActionEnum {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  SOFT_DELETE = 'softDelete',
  RESTORE = 'restore',
}

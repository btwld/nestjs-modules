/**
 * Base operations enum used across the Rockets ecosystem.
 *
 * This is the single source of truth for operation names.
 * Module-specific enums (CrudOperations, HookOperation) should
 * mirror these values for consistency.
 */
export enum Operation {
  List = 'list',
  Read = 'read',
  Create = 'create',
  CreateBatch = 'createBatch',
  Update = 'update',
  Replace = 'replace',
  Delete = 'delete',
  SoftDelete = 'softDelete',
  Restore = 'restore',
}

/**
 * Operations that read data without modification.
 */
export const ReadOperations = [Operation.List, Operation.Read] as const;

/**
 * Operations that write data (create/update).
 */
export const WriteOperations = [
  Operation.Create,
  Operation.CreateBatch,
  Operation.Update,
  Operation.Replace,
] as const;

/**
 * Operations that mutate data (write + delete/restore).
 */
export const MutateOperations = [
  ...WriteOperations,
  Operation.Delete,
  Operation.SoftDelete,
  Operation.Restore,
] as const;

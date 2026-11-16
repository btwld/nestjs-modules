import { type ActionEnum } from '@concepta/nestjs-core';

/**
 * The category a CRUD operation falls in, for choosing which hooks run:
 * soft delete counts as `DELETE` and restore as `UPDATE`.
 *
 * Not the action an authority decides: soft delete and restore are actions
 * of their own there. Authorize by `operation`, or by the action a route's
 * grant names.
 */
export type CrudActionCategory = Extract<
  ActionEnum,
  ActionEnum.CREATE | ActionEnum.READ | ActionEnum.UPDATE | ActionEnum.DELETE
>;

import { HttpStatus } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

import { RoleException } from '../exceptions/role.exception.js';

/**
 * Asserts that `value` is a non-empty string id.
 *
 * Classified `fault: 'client'` for the common case of a caller sending a
 * malformed id directly. A controller whose id param is configured with
 * `type: 'number'` (see `CrudParams`) will also route through here on every
 * request — that's a module wiring mistake, not a client one, but the
 * distinction isn't visible from inside this assertion.
 */
export function assertRoleId(value: unknown): asserts value is ReferenceId {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RoleException({
      message: 'Expected role id to be a non-empty string, got %s',
      messageParams: [typeof value],
      safeMessage: 'Invalid id',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });
  }
}

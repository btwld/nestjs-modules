import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { RoleException } from './role.exception.js';

export class RoleAssignmentConflictException extends RoleException {
  declare context: RuntimeException['context'] & {
    roleId: string;
    assigneeId: string;
  };

  constructor(
    roleId: string,
    assigneeId: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Role %s is already assigned to assignee %s.',
      messageParams: [roleId, assigneeId],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'ROLE_ASSIGNMENT_CONFLICT_ERROR';

    this.context = {
      ...this.context,
      roleId,
      assigneeId,
    };
  }
}

import { HttpStatus } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { RoleException } from './role.exception.js';

export class RoleAssignmentsConflictException extends RoleException {
  declare context: RuntimeException['context'] & {
    assigneeId: string;
  };

  constructor(assigneeId: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'One or more roles are already assigned to assignee %s.',
      messageParams: [assigneeId],
      httpStatus: HttpStatus.CONFLICT,
      fault: 'client',
      ...options,
    });

    this.errorCode = 'ROLE_ASSIGNMENTS_CONFLICT_ERROR';

    this.context = {
      ...this.context,
      assigneeId,
    };
  }
}

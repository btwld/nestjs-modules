import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { RoleException } from './role.exception.js';

export class RoleNotFoundException extends RoleException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(options: { id: string; message?: string }) {
    const { id, message = 'Role not found for id=%s' } = options;

    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message,
      messageParams: [id],
      fault: 'client',
    });

    this.errorCode = 'ROLE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}

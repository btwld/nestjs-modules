import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { UserException } from '../../domain/exceptions/user.exception.js';

export class UserNotFoundException extends UserException {
  declare context: RuntimeException['context'] & {
    id: string;
  };

  constructor(options: { id: string; message?: string }) {
    const { id, message = 'User not found for id=%s' } = options;

    super({
      httpStatus: HttpStatus.NOT_FOUND,
      message,
      messageParams: [id],
      fault: 'client',
    });

    this.errorCode = 'USER_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      id,
    };
  }
}

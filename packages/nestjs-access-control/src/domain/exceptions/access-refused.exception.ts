import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { type AccessRefusedDetailsInterface } from '../interfaces/access-refused-details.interface.js';

import { AccessControlException } from './access-control.exception.js';

/**
 * Thrown when a call is not allowed. The message names the action and the
 * resource; why it was refused, and the gate when one is pending, are in
 * the context.
 */
export class AccessRefusedException extends AccessControlException {
  declare context: RuntimeException['context'] & AccessRefusedDetailsInterface;

  constructor(details: AccessRefusedDetailsInterface) {
    super({
      message: 'Not allowed to %s %s',
      messageParams: [details.action, details.resource],
      httpStatus: HttpStatus.FORBIDDEN,
      fault: 'client',
    });

    this.errorCode = 'ACCESS_REFUSED_ERROR';

    this.context = {
      ...this.context,
      ...details,
    };
  }
}

import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { type AccessRefusedDetailsInterface } from '../interfaces/access-refused-details.interface.js';

import { AccessControlException } from './access-control.exception.js';

/**
 * Thrown when a call is not allowed. Names what was asked and why it was
 * refused.
 */
export class AccessRefusedException extends AccessControlException {
  declare context: RuntimeException['context'] & AccessRefusedDetailsInterface;

  constructor(details: AccessRefusedDetailsInterface) {
    super({
      message: 'Access refused: %s on %s (%s)',
      messageParams: [details.action, details.subject, details.reason],
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

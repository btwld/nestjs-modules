import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../exceptions/runtime.exception.js';

/**
 * Exception thrown when two amounts in different currencies are combined.
 *
 * There is no implicit conversion: a rate is a business decision with a date,
 * a source and an audit trail attached, none of which an arithmetic operator
 * can supply. Convert explicitly, then add.
 */
export class CurrencyMismatchException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    operation: string;
    left: string;
    right: string;
  };

  constructor(
    operation: string,
    left: string,
    right: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Cannot %s amounts in different currencies (%s and %s) — ' +
        'convert one explicitly first',
      messageParams: [operation, left, right],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, operation, left, right };
    this.errorCode = 'CURRENCY_MISMATCH';
  }
}

import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../exceptions/runtime.exception.js';

/**
 * Exception thrown when an input to a money operation is invalid: an amount,
 * factor or weight that cannot be read exactly, a `number` passed to
 * `Money.of()`, division by zero, an empty or all-zero weight list, or a
 * format scale that would round.
 *
 * A `number` is refused because it carries no evidence of what has already
 * been done to it — `0.1 + 0.2` arrives as `0.30000000000000004`. Use
 * `Money.fromNumber()` where a boundary genuinely hands over a number.
 */
export class MoneyInvalidAmountException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    received: string;
    receivedType: string;
  };

  constructor(
    received: unknown,
    reason: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message: 'Invalid money input "%s": %s',
      messageParams: [String(received), reason],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'usage',
      ...options,
    });

    this.context = {
      ...this.context,
      received: String(received),
      receivedType: typeof received,
    };
    this.errorCode = 'MONEY_INVALID_AMOUNT';
  }
}

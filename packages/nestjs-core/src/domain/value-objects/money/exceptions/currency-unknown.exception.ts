import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../exceptions/runtime.exception.js';

/**
 * Exception thrown when a currency code is not one this process accepts —
 * neither built in nor added with `configureCurrencies`.
 *
 * Raised instead of defaulting to two decimal places: a guessed scale would
 * let a typo pass as a real currency, and would round every amount in a
 * zero- or three-decimal currency to the wrong scale.
 */
export class CurrencyUnknownException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    code: string;
  };

  constructor(code: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        '"%s" is not a configured currency — expected an ISO 4217 code ' +
        'such as USD, EUR or JPY; add others with configureCurrencies()',
      messageParams: [code],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, code };
    this.errorCode = 'CURRENCY_UNKNOWN';
  }
}

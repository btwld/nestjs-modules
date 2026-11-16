import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../exceptions/runtime.exception.js';

/**
 * Exception thrown when `configureCurrencies` is called in a way that could
 * change a currency's scale while amounts are in use, or with an invalid
 * table.
 *
 * `fault: 'usage'` because it is a startup mistake in the application, not
 * something a request caused.
 */
export class CurrencyConfigurationException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    reason: string;
  };

  constructor(reason: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Currency configuration refused: %s',
      messageParams: [reason],
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, reason };
    this.errorCode = 'CURRENCY_CONFIGURATION';
  }
}

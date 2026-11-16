import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '../../../exceptions/interfaces/runtime-exception-options.interface.js';
import { RuntimeException } from '../../../exceptions/runtime.exception.js';

/**
 * Exception thrown when a money column hands back a value that has already
 * lost precision.
 *
 * Almost always means the column was declared with the wrong type: `real`,
 * `float`, or — on SQLite — `decimal`/`numeric`, which carries NUMERIC
 * affinity and comes back as a JavaScript number. Declare money columns
 * `numeric` on Postgres and `text` on SQLite.
 *
 * `fault: 'internal'` because no request caused this and no retry fixes it:
 * the schema is wrong and every row read through that column is suspect.
 */
export class MoneyColumnTypeException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    received: string;
    receivedType: string;
  };

  constructor(received: unknown, options?: RuntimeExceptionOptions) {
    super({
      message:
        'A money column returned %s (%s), which has already lost precision — ' +
        'declare the column numeric on Postgres and text on SQLite',
      messageParams: [String(received), typeof received],
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      fault: 'internal',
      ...options,
    });

    this.context = {
      ...this.context,
      received: String(received),
      receivedType: typeof received,
    };
    this.errorCode = 'MONEY_COLUMN_TYPE';
  }
}

import ms from 'ms';

import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionFault } from '../../domain/exceptions/exception.types.js';
import { RuntimeException } from '../../domain/exceptions/runtime.exception.js';

/**
 * Converts a time string value to milliseconds using the ms library.
 * Uses the fallback value if the input is empty or nullish.
 * Throws a RuntimeException if neither the value nor fallback can be parsed.
 *
 * Whether an unparseable value is the caller's mistake or a bad
 * module-configured default depends on where `value`/`fallback` came from,
 * which only the caller knows — pass `fault` explicitly when that's
 * determinable. Defaults to `'internal'`, matching `RuntimeException`'s own
 * fail-loud default for anything unclassified.
 *
 * @param value - The time string value to convert (e.g., '1h', '30m', '99y')
 * @param fallback - The fallback value to use if value is empty/nullish
 * @param fault - Who's at fault if neither value nor fallback parses
 * @returns The number of milliseconds
 * @internal
 */
export function toMilliseconds(
  value: unknown,
  fallback?: ms.StringValue | number,
  fault: RuntimeExceptionFault = 'internal',
): number {
  const input = typeof value === 'string' ? value : fallback;

  const result = ms(input as ms.StringValue);
  if (typeof result === 'number') {
    return result;
  } else {
    throw new RuntimeException({
      message: 'Invalid ms string value',
      httpStatus: HttpStatus.BAD_REQUEST,
      fault,
    });
  }
}

import ms from 'ms';

import { HttpStatus } from '@nestjs/common';

import { RuntimeException } from '../exceptions/runtime.exception';

/**
 * Converts a time string value to milliseconds using the ms library.
 * Uses the fallback value if the input is empty or nullish.
 * Throws a RuntimeException if neither the value nor fallback can be parsed.
 *
 * @param value - The time string value to convert (e.g., '1h', '30m', '99y')
 * @param fallback - The fallback value to use if value is empty/nullish
 * @returns The number of milliseconds
 * @internal
 */
export function toMilliseconds(
  value: unknown,
  fallback?: ms.StringValue | number,
): number {
  const input = typeof value === 'string' ? value : fallback;
  const result = ms(input as ms.StringValue);
  if (typeof result === 'number') {
    return result;
  } else {
    throw new RuntimeException({
      message: 'Invalid ms string value',
      httpStatus: HttpStatus.BAD_REQUEST,
    });
  }
}

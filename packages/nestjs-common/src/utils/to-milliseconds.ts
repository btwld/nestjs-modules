import ms from 'ms';

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
  const result = ms((value as ms.StringValue) ?? fallback);
  if (typeof result === 'number') {
    return result;
  } else {
    throw new RuntimeException({
      message: 'Invalid ms string value',
      httpStatus: 400,
    });
  }
}

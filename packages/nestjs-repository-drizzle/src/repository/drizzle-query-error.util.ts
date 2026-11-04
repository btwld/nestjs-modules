import { type DrizzleQueryError } from 'drizzle-orm';

/**
 * Whether `error` is a query Drizzle ran and the database failed. Told by
 * its shape, not its class: drizzle-orm ships an ESM and a CommonJS build,
 * each with its own `DrizzleQueryError`, and an application may load the
 * other build than this package does.
 */
export function isDrizzleQueryError(
  error: unknown,
): error is DrizzleQueryError {
  return (
    error instanceof Error &&
    'query' in error &&
    typeof error.query === 'string' &&
    'params' in error &&
    Array.isArray(error.params)
  );
}

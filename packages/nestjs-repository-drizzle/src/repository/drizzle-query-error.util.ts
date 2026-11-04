import { type DrizzleQueryError } from 'drizzle-orm';

import { type RepositoryDatabaseErrorInterface } from '@concepta/nestjs-repository';

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

/**
 * A query `database` failed, reported with the database client's own error
 * and code: `code` where the client sets one, else `errno`. Never Drizzle's
 * own message, which holds the query and its values. `undefined` for any
 * other error.
 */
export function describeQueryFailure(
  error: unknown,
  database: string,
): RepositoryDatabaseErrorInterface | undefined {
  if (!isDrizzleQueryError(error)) return undefined;
  const reported = error.cause instanceof Error ? error.cause : undefined;
  const code =
    reported &&
    'code' in reported &&
    (typeof reported.code === 'string' || typeof reported.code === 'number')
      ? reported.code
      : reported && 'errno' in reported && typeof reported.errno === 'number'
        ? reported.errno
        : undefined;
  return {
    database,
    code,
    message: reported?.message ?? 'the database client gave no error',
  };
}

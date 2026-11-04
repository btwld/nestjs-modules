import { sql } from 'drizzle-orm';

import { type RepositoryDatabaseErrorInterface } from '@concepta/nestjs-repository';

import {
  describeQueryFailure,
  isDrizzleQueryError,
} from '../repository/drizzle-query-error.util.js';

import { type DrizzlePostgresTransactionSettings } from './drizzle-postgres-transaction-settings.type.js';
import { DRIZZLE_POSTGRES_DATABASE } from './drizzle-postgres.constants.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/**
 * A statement Postgres failed: a query Drizzle ran, or the server's own
 * error as the client threw it, which PGlite and postgres-js do for the
 * `BEGIN` and `COMMIT` they run themselves. A server error is told by its
 * shape (a `code` and a `severity`), which every Postgres client gives it.
 * `undefined` for any other error.
 */
export function describePostgresFailure(
  error: unknown,
): RepositoryDatabaseErrorInterface | undefined {
  return (
    describeQueryFailure(error, DRIZZLE_POSTGRES_DATABASE) ??
    describePostgresRefusal(error)
  );
}

/**
 * An error the Postgres server sent, thrown as is or under a query Drizzle
 * ran, such as a commit it refused. Any other error, such as a lost
 * connection or a client timeout, is `undefined`: a commit that failed
 * with it may still have been kept.
 */
export function describePostgresRefusal(
  error: unknown,
): RepositoryDatabaseErrorInterface | undefined {
  const reported =
    isDrizzleQueryError(error) && error.cause instanceof Error
      ? error.cause
      : error;
  if (
    reported instanceof Error &&
    'code' in reported &&
    typeof reported.code === 'string' &&
    'severity' in reported &&
    typeof reported.severity === 'string'
  ) {
    return {
      database: DRIZZLE_POSTGRES_DATABASE,
      code: reported.code,
      message: reported.message,
    };
  }
  return undefined;
}

/**
 * Apply `settings` in the transaction `tx`, in order, with
 * `set_config(name, value, true)`; an `undefined` value is skipped.
 */
export async function applyTransactionSettings(
  tx: DrizzlePostgresClient,
  settings: DrizzlePostgresTransactionSettings,
): Promise<void> {
  for (const [name, value] of Object.entries(settings)) {
    if (value !== undefined) {
      await tx.execute(sql`select set_config(${name}, ${value}, true)`);
    }
  }
}

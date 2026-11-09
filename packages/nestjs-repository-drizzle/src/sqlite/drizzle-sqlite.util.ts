import { DrizzleError, is, sql } from 'drizzle-orm';

import { type RepositoryDatabaseErrorInterface } from '@concepta/nestjs-repository';

import { describeQueryFailure } from '../repository/drizzle-query-error.util.js';

import { DRIZZLE_SQLITE_DATABASE } from './drizzle-sqlite.constants.js';
import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';

/**
 * A query SQLite failed: what `describeSqliteRefusal` reports, or any
 * other query Drizzle ran that failed. `undefined` for any other error.
 */
export function describeSqliteFailure(
  error: unknown,
): RepositoryDatabaseErrorInterface | undefined {
  return (
    describeSqliteRefusal(error) ??
    describeQueryFailure(error, DRIZZLE_SQLITE_DATABASE)
  );
}

/**
 * An error SQLite itself reported, as better-sqlite3's `SqliteError`:
 * thrown as is by a query Drizzle builds, and as the cause of a
 * `DrizzleError` by one the adapter runs itself (`BEGIN IMMEDIATE`,
 * `COMMIT`), so a database another connection has locked reports
 * `SQLITE_BUSY` either way. `undefined` for any other error.
 */
export function describeSqliteRefusal(
  error: unknown,
): RepositoryDatabaseErrorInterface | undefined {
  const reported =
    is(error, DrizzleError) && 'cause' in error && error.cause instanceof Error
      ? error.cause
      : error;
  if (
    reported instanceof Error &&
    reported.name === 'SqliteError' &&
    'code' in reported &&
    typeof reported.code === 'string'
  ) {
    return {
      database: DRIZZLE_SQLITE_DATABASE,
      code: reported.code,
      message: reported.message,
    };
  }
  return undefined;
}

/**
 * Roll back the open transaction after `error`, and throw `error`. A
 * statement that failed with one of `SQLITE_TRANSACTION_ENDED_CODES` may
 * have rolled the transaction back already, and the rollback's own refusal
 * would hide why.
 */
export function rollbackAfter(db: DrizzleSqliteClient, error: unknown): never {
  try {
    db.run(sql`rollback`);
  } catch {
    // The transaction is over either way; the original error says why.
  }
  throw error;
}

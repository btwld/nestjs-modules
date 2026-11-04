import { DrizzleQueryError, sql } from 'drizzle-orm';

import { DrizzleTransaction } from '../transaction/drizzle-transaction.js';

import { type DrizzlePostgresTransactionSettings } from './drizzle-postgres-transaction-settings.type.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';
import { applyTransactionSettings } from './drizzle-postgres.util.js';

/**
 * A transaction on a Drizzle Postgres database.
 */
export class DrizzlePostgresTransaction extends DrizzleTransaction<DrizzlePostgresClient> {
  /**
   * @param db - The database to run on
   * @param settings - Applied with `set_config(name, value, true)` once the
   *   transaction has begun, in order; an `undefined` value is skipped
   */
  constructor(
    private readonly db: DrizzlePostgresClient,
    private readonly settings: DrizzlePostgresTransactionSettings = {},
  ) {
    super();
  }

  protected begin(
    work: (tx: DrizzlePostgresClient) => Promise<void>,
  ): Promise<void> {
    return this.db.transaction(async (tx) => {
      await applyTransactionSettings(tx, this.settings);
      await work(tx);
    });
  }

  /**
   * Postgres ends a transaction at its first failed statement, then answers
   * `COMMIT` with a rollback and no error. One statement first fails if it
   * has, so a commit that would write nothing is refused, with the
   * database's own error.
   */
  protected override async beforeCommit(
    client: DrizzlePostgresClient,
  ): Promise<void> {
    try {
      await client.execute(sql`select 1`);
    } catch (error) {
      throw error instanceof DrizzleQueryError && error.cause instanceof Error
        ? error.cause
        : error;
    }
  }
}

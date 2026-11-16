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
}

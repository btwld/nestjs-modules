import { DrizzleTransaction } from '../transaction/drizzle-transaction.js';

import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/**
 * A transaction on a Drizzle Postgres database.
 */
export class DrizzlePostgresTransaction extends DrizzleTransaction<DrizzlePostgresClient> {
  constructor(private readonly db: DrizzlePostgresClient) {
    super();
  }

  protected begin(
    work: (tx: DrizzlePostgresClient) => Promise<void>,
  ): Promise<void> {
    return this.db.transaction(work);
  }
}

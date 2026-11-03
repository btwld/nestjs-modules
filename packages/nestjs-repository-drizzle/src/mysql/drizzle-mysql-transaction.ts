import { DrizzleTransaction } from '../transaction/drizzle-transaction.js';

import { type DrizzleMysqlClient } from './drizzle-mysql.types.js';

/**
 * A transaction on a Drizzle MySQL database.
 */
export class DrizzleMysqlTransaction extends DrizzleTransaction<DrizzleMysqlClient> {
  constructor(private readonly db: DrizzleMysqlClient) {
    super();
  }

  protected begin(
    work: (tx: DrizzleMysqlClient) => Promise<void>,
  ): Promise<void> {
    return this.db.transaction(work);
  }
}

import { sql } from 'drizzle-orm';

import { type DrizzlePostgresTransactionSettings } from './drizzle-postgres-transaction-settings.type.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

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

import { sql } from 'drizzle-orm';

import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';

/**
 * Roll back the open transaction after `error`, and throw `error`. A
 * statement that failed with SQLITE_FULL, IOERR, NOMEM or INTERRUPT may have
 * rolled the transaction back already, and the rollback's own refusal would
 * hide why.
 */
export function rollbackAfter(db: DrizzleSqliteClient, error: unknown): never {
  try {
    db.run(sql`rollback`);
  } catch {
    // The transaction is over either way; the original error says why.
  }
  throw error;
}

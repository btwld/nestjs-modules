import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * A Drizzle database the SQLite adapter reads and writes through: a
 * database created by the better-sqlite3 entry point, with or without a
 * schema. Its one connection is also its transactions' client.
 */
export type DrizzleSqliteClient = BetterSQLite3Database<
  Record<string, unknown>
>;

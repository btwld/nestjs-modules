import { type PgDatabase, type PgQueryResultHKT } from 'drizzle-orm/pg-core';

/**
 * A Drizzle database the Postgres adapter reads and writes through: a
 * database created by any Postgres entry point (node-postgres, postgres.js,
 * PGlite, ...), with or without a schema, or a transaction on one.
 */
export type DrizzlePostgresClient = PgDatabase<
  PgQueryResultHKT,
  Record<string, unknown>
>;

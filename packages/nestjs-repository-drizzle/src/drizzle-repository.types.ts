import { type PgDatabase, type PgQueryResultHKT } from 'drizzle-orm/pg-core';

/**
 * A Drizzle database the driver reads and writes through: a database
 * created by any Postgres entry point (node-postgres, postgres.js, PGlite,
 * ...), with or without a schema, or a transaction on one.
 */
export type DrizzleClient = PgDatabase<
  PgQueryResultHKT,
  Record<string, unknown>
>;

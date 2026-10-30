import { type EmptyRelations } from 'drizzle-orm';
import {
  type PgAsyncDatabase,
  type PgQueryResultHKT,
} from 'drizzle-orm/pg-core';

/**
 * A Drizzle database the driver reads and writes through: a database
 * created by any async Postgres entry point (node-postgres, postgres.js,
 * PGlite, ...), or a transaction on one.
 */
export type DrizzleClient = PgAsyncDatabase<PgQueryResultHKT, EmptyRelations>;

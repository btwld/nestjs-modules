import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';

import { type DrizzlePostgresConnect } from './drizzle-postgres-connect.type.js';

/** A fresh in-process Postgres for each application: the fast CI run. */
export const pgliteDatabase: DrizzlePostgresConnect = ({ logger }) =>
  drizzlePglite({ client: new PGlite(), logger });

/**
 * The docker stack's Postgres (`pnpm test:docker`), through node-postgres:
 * a real server and a real client, which reads and types values its own
 * way.
 */
export const nodePostgresDatabase: DrizzlePostgresConnect = ({ logger }) =>
  drizzleNodePostgres({
    connection:
      process.env.POSTGRES_URL ??
      'postgres://postgres:postgres@localhost:55432/rockets_test',
    logger,
  });

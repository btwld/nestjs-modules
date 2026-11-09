import { describeDrizzlePostgresReads } from '../__fixtures__/drizzle-postgres-read.fixture.js';
import { pgliteDatabase } from '../__fixtures__/postgres-databases.fixture.js';

describeDrizzlePostgresReads(
  'DrizzlePostgresRepository reads (PGlite)',
  pgliteDatabase,
);

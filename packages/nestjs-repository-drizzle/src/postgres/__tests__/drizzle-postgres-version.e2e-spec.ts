import { describeDrizzlePostgresVersion } from '../__fixtures__/drizzle-postgres-version.fixture.js';
import { pgliteDatabase } from '../__fixtures__/postgres-databases.fixture.js';

describeDrizzlePostgresVersion(
  'DrizzlePostgresRepository version (PGlite)',
  pgliteDatabase,
);

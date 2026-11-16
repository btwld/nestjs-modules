import { describeDrizzlePostgresVersion } from '../__fixtures__/drizzle-postgres-version.fixture.js';
import { nodePostgresDatabase } from '../__fixtures__/postgres-databases.fixture.js';

describeDrizzlePostgresVersion(
  'DrizzlePostgresRepository version (node-postgres)',
  nodePostgresDatabase,
);

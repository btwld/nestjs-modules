import { describeDrizzlePostgresReads } from '../__fixtures__/drizzle-postgres-read.fixture.js';
import { nodePostgresDatabase } from '../__fixtures__/postgres-databases.fixture.js';

describeDrizzlePostgresReads(
  'DrizzlePostgresRepository reads (node-postgres)',
  nodePostgresDatabase,
);

import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmPostgresRepositoryModule } from '../typeorm-postgres-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness(
    'typeorm/postgres',
    TypeOrmPostgresRepositoryModule,
    {
      type: 'postgres',
      url:
        process.env.POSTGRES_URL ??
        'postgres://postgres:postgres@localhost:55432/rockets_test',
      dropSchema: true,
    },
  ),
  { describe, it, beforeAll, afterAll, beforeEach },
);

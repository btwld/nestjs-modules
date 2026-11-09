import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmMariadbRepositoryModule } from '../typeorm-mariadb-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness('typeorm/mariadb', TypeOrmMariadbRepositoryModule, {
    type: 'mariadb',
    url:
      process.env.MARIADB_URL ??
      'mariadb://root:mariadb@localhost:53307/rockets_test',
    dropSchema: true,
  }),
  { describe, it, beforeAll, afterAll, beforeEach },
);

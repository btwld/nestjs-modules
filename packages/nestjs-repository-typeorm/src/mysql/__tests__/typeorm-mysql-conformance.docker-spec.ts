import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmMysqlRepositoryModule } from '../typeorm-mysql-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness('typeorm/mysql', TypeOrmMysqlRepositoryModule, {
    type: 'mysql',
    url:
      process.env.MYSQL_URL ??
      'mysql://root:mysql@localhost:53306/rockets_test',
    dropSchema: true,
  }),
  { describe, it, beforeAll, afterAll, beforeEach },
);

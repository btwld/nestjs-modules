import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmOracleRepositoryModule } from '../typeorm-oracle-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness('typeorm/oracle', TypeOrmOracleRepositoryModule, {
    type: 'oracle',
    connectString:
      process.env.ORACLE_CONNECT_STRING ?? 'localhost:51521/FREEPDB1',
    username: 'rockets',
    password: 'rockets',
    dropSchema: true,
  }),
  { describe, it, beforeAll, afterAll, beforeEach },
);

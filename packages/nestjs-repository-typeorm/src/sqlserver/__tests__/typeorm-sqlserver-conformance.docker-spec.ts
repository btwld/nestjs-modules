import { runRepositoryConformance } from '@concepta/nestjs-repository/conformance';

import { typeOrmConformanceHarness } from '../../__fixtures__/conformance/conformance-harness.fixture.js';
import { TypeOrmSqlServerRepositoryModule } from '../typeorm-sqlserver-repository.module.js';

runRepositoryConformance(
  typeOrmConformanceHarness(
    'typeorm/sqlserver',
    TypeOrmSqlServerRepositoryModule,
    {
      type: 'mssql',
      host: process.env.SQLSERVER_HOST ?? 'localhost',
      port: Number(process.env.SQLSERVER_PORT ?? 51433),
      username: 'sa',
      password: 'Rockets-Test-1',
      database: 'rockets_test',
      options: { trustServerCertificate: true, useUTC: true },
      dropSchema: true,
    },
  ),
  { describe, it, beforeAll, afterAll, beforeEach },
);

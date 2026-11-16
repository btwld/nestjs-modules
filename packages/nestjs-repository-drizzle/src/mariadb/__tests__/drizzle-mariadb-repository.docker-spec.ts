import { describeDrizzleMysqlRepository } from '../../mysql/__fixtures__/drizzle-mysql-repository.fixture.js';
import { DrizzleMariadbRepositoryModule } from '../drizzle-mariadb-repository.module.js';

describeDrizzleMysqlRepository(
  'DrizzleMariadbRepository',
  DrizzleMariadbRepositoryModule,
  process.env.MARIADB_URL ??
    'mysql://root:mariadb@localhost:53307/rockets_test',
);

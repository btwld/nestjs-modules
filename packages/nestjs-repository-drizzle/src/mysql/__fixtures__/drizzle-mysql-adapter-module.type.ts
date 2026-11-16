import { type DrizzleMariadbRepositoryModule } from '../../mariadb/drizzle-mariadb-repository.module.js';
import { type DrizzleMysqlRepositoryModule } from '../drizzle-mysql-repository.module.js';

/** The adapters that speak MySQL's protocol, which these fixtures run. */
export type DrizzleMysqlAdapterModule =
  typeof DrizzleMysqlRepositoryModule | typeof DrizzleMariadbRepositoryModule;

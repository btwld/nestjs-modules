/**
 * `@concepta/nestjs-repository-drizzle/mariadb`
 *
 * The Drizzle repository driver for MariaDB, through the mysql2 client: its
 * module and repository. Its transactions and client are the MySQL
 * adapter's.
 */

export { DrizzleMariadbRepositoryModule } from './mariadb/drizzle-mariadb-repository.module.js';
export { DrizzleMariadbRepository } from './mariadb/drizzle-mariadb-repository.js';
export { DrizzleRepositoryOptions } from './repository/drizzle-repository-options.interface.js';
export { DrizzleMysqlTransaction } from './mysql/drizzle-mysql-transaction.js';
export { DrizzleMysqlTransactionFactory } from './mysql/drizzle-mysql-transaction.factory.js';
export { DrizzleMysqlClient } from './mysql/drizzle-mysql.types.js';

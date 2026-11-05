/**
 * `@concepta/nestjs-repository-typeorm/mariadb`
 *
 * The TypeORM repository driver for MariaDB: its module, repository and
 * base entities. Transactions are MySQL's, which MariaDB shares.
 */

export { TypeOrmMariadbRepositoryModule } from './mariadb/typeorm-mariadb-repository.module.js';
export { TypeOrmMariadbRepository } from './mariadb/typeorm-mariadb-repository.js';
export { TypeOrmRepositoryOptions } from './repository/typeorm-repository-options.interface.js';
export { TypeOrmMysqlTransaction } from './mysql/typeorm-mysql-transaction.js';
export { TypeOrmMysqlTransactionFactory } from './mysql/typeorm-mysql-transaction.factory.js';

export { ActivityMariadbEntity } from './mariadb/entities/activity-mariadb.entity.js';
export { AppendOnlyMariadbEntity } from './mariadb/entities/append-only-mariadb.entity.js';
export { AuditMariadbEntity } from './mariadb/entities/audit-mariadb.entity.js';
export { CommonMariadbEntity } from './mariadb/entities/common-mariadb.entity.js';

/**
 * `@concepta/nestjs-repository-typeorm/oracle`
 *
 * The TypeORM repository driver for Oracle: its module, repository,
 * transactions and base entities.
 */

export { TypeOrmOracleRepositoryModule } from './oracle/typeorm-oracle-repository.module.js';
export { TypeOrmOracleDriverOptionsInterface } from './oracle/typeorm-oracle-driver-options.interface.js';
export { TypeOrmOracleApplicationContextInterface } from './oracle/typeorm-oracle-application-context.interface.js';
export { TypeOrmOracleApplicationContextResolver } from './oracle/typeorm-oracle-application-context-resolver.type.js';
export { TypeOrmOracleRepository } from './oracle/typeorm-oracle-repository.js';
export { TypeOrmRepositoryOptions } from './repository/typeorm-repository-options.interface.js';
export { TypeOrmOracleTransaction } from './oracle/typeorm-oracle-transaction.js';
export { TypeOrmOracleTransactionFactory } from './oracle/typeorm-oracle-transaction.factory.js';

export { ActivityOracleEntity } from './oracle/entities/activity-oracle.entity.js';
export { AppendOnlyOracleEntity } from './oracle/entities/append-only-oracle.entity.js';
export { AuditOracleEntity } from './oracle/entities/audit-oracle.entity.js';
export { CommonOracleEntity } from './oracle/entities/common-oracle.entity.js';

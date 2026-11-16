import { AuditMysqlEntity } from '../../mysql/entities/audit-mysql.entity.js';

/**
 * Audit MariaDB: the MySQL audit columns, which TypeORM maps to MariaDB's
 * own types.
 */
export abstract class AuditMariadbEntity extends AuditMysqlEntity {}

import { CommonMysqlEntity } from '../../mysql/entities/common-mysql.entity.js';

/**
 * Common MariaDB: a generated `uuid` id and the audit columns, stored in
 * MariaDB's native `uuid` type.
 */
export abstract class CommonMariadbEntity extends CommonMysqlEntity {}

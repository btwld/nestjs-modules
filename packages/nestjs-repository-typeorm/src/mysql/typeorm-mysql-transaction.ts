import { TypeOrmTransaction } from '../transaction/typeorm-transaction.js';

/**
 * A transaction on a MySQL or MariaDB data source.
 */
export class TypeOrmMysqlTransaction extends TypeOrmTransaction {}

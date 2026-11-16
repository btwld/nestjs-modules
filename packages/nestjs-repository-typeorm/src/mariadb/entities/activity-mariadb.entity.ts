import { ActivityMysqlEntity } from '../../mysql/entities/activity-mysql.entity.js';

/**
 * Base entity for an activity store (MariaDB): the MySQL activity columns,
 * which TypeORM maps to MariaDB's own types.
 */
export abstract class ActivityMariadbEntity extends ActivityMysqlEntity {}

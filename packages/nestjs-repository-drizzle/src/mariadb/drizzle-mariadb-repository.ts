import { type PlainLiteralObject } from '@nestjs/common';

import { DrizzleMysqlRepository } from '../mysql/drizzle-mysql-repository.js';
import { type DrizzleMysqlClient } from '../mysql/drizzle-mysql.types.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';

import { DRIZZLE_MARIADB_DATABASE } from './drizzle-mariadb.constants.js';

/**
 * A repository on a Drizzle MariaDB database, through the mysql2 client:
 * the MySQL adapter's statements, reporting its errors as MariaDB's.
 */
export class DrizzleMariadbRepository<
  Entity extends PlainLiteralObject,
> extends DrizzleMysqlRepository<Entity> {
  constructor(options: DrizzleRepositoryOptions<Entity, DrizzleMysqlClient>) {
    super(options, DRIZZLE_MARIADB_DATABASE);
  }
}

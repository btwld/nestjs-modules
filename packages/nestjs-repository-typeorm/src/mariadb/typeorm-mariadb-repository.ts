import { type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { TypeOrmMysqlRepository } from '../mysql/typeorm-mysql-repository.js';
import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';

import { TYPEORM_MARIADB_DATABASE } from './typeorm-mariadb.constants.js';

/**
 * A repository on a MariaDB data source.
 */
export class TypeOrmMariadbRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmMysqlRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_MARIADB_DATABASE);
  }
}

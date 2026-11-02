import { type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';

import { TYPEORM_SQLITE_DATABASE } from './typeorm-sqlite.constants.js';

/**
 * A repository on a SQLite data source.
 */
export class TypeOrmSqliteRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_SQLITE_DATABASE);
  }
}

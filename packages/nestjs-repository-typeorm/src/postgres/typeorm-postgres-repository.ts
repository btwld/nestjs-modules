import { type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';

import { TYPEORM_POSTGRES_DATABASES } from './typeorm-postgres.constants.js';

/**
 * A repository on a Postgres data source.
 */
export class TypeOrmPostgresRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_POSTGRES_DATABASES);
  }
}

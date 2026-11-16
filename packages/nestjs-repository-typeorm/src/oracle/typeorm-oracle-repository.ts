import { type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';

import { TYPEORM_ORACLE_DATABASE } from './typeorm-oracle.constants.js';

/**
 * A repository on an Oracle data source.
 */
export class TypeOrmOracleRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_ORACLE_DATABASE);
  }
}

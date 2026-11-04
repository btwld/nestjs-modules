import { QueryFailedError, type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';

import { TYPEORM_POSTGRES_DATABASE } from './typeorm-postgres.constants.js';

/**
 * A repository on a Postgres data source.
 */
export class TypeOrmPostgresRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_POSTGRES_DATABASE);
  }

  /**
   * Any failed statement: Postgres ends the transaction it ran in, and
   * answers a later `COMMIT` with a rollback.
   */
  protected override endsTransaction(error: unknown): boolean {
    return error instanceof QueryFailedError;
  }
}

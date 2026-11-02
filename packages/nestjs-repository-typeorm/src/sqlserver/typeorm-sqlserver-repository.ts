import { QueryFailedError, type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryDatabaseErrorInterface } from '@concepta/nestjs-repository';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';

import { TYPEORM_SQLSERVER_DATABASE } from './typeorm-sqlserver.constants.js';

/**
 * A repository on a SQL Server data source.
 */
export class TypeOrmSqlServerRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_SQLSERVER_DATABASE);
  }

  /**
   * SQL Server's `LIKE` also reads `[` as the start of a character set.
   */
  protected override escapeLike(value: string): string {
    return value.replace(/[!%_[]/g, '!$&');
  }

  /**
   * The client's `code` is `'EREQUEST'` for every failed query; SQL
   * Server's own error number (`2627`, `547`, …) is reported instead.
   */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    const described = super.describeDatabaseError(error);
    if (!described || !(error instanceof QueryFailedError)) {
      return described;
    }
    const reported: Error = error.driverError;
    return 'number' in reported && typeof reported.number === 'number'
      ? { ...described, code: reported.number }
      : described;
  }
}

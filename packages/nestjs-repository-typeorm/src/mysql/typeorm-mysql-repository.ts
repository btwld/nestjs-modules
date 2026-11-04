import {
  type FindManyOptions,
  type FindOneOptions,
  QueryFailedError,
  type Repository,
} from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryFindOptions } from '@concepta/nestjs-repository';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';
import { dataSourceOf } from '../typeorm-repository.util.js';

import { TypeOrmMysqlFoundRowsException } from './typeorm-mysql-found-rows.exception.js';
import {
  MYSQL_TRANSACTION_ENDED_ERRNOS,
  TYPEORM_MYSQL_DATABASE,
} from './typeorm-mysql.constants.js';

/**
 * A repository on a MySQL data source. Refuses a data source that turns off
 * the `FOUND_ROWS` client flag (on by default).
 */
export class TypeOrmMysqlRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  /**
   * @param repo - The TypeORM repository to wrap
   * @param options - The repository's options
   * @param databaseType - The database type the adapter is for: `mysql`,
   *   or `mariadb` for the MariaDB adapter, which shares this client
   */
  constructor(
    repo: Repository<Entity>,
    options: TypeOrmRepositoryOptions,
    databaseType: string = TYPEORM_MYSQL_DATABASE,
  ) {
    super(repo, options, databaseType);

    if (
      clientFlags(dataSourceOf(repo.manager).options).includes('-FOUND_ROWS')
    ) {
      throw new TypeOrmMysqlFoundRowsException(this.metadata.name);
    }
  }

  /**
   * A plain read in a transaction that has read before returns its
   * snapshot, not a row another transaction has committed since, unless
   * this transaction changed it: the re-read of a written row locks it.
   */
  protected override readonly rereadLock: FindOneOptions<Entity>['lock'] = {
    mode: 'pessimistic_write',
  };

  /**
   * A deadlock, or a lock table out of memory: MySQL has rolled the whole
   * transaction back.
   */
  protected override endsTransaction(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const reported: Error = error.driverError;
    return (
      'errno' in reported &&
      typeof reported.errno === 'number' &&
      MYSQL_TRANSACTION_ENDED_ERRNOS.includes(reported.errno)
    );
  }

  /**
   * MySQL has no offset without a limit, so a read that skips rows but takes
   * all the rest is given the largest limit, as MySQL's manual suggests.
   */
  protected override buildNativeFindManyOptions(
    options: RepositoryFindOptions<Entity>,
  ): FindManyOptions<Entity> {
    const native = super.buildNativeFindManyOptions(options);
    return native.skip !== undefined && native.take === undefined
      ? { ...native, take: Number.MAX_SAFE_INTEGER }
      : native;
  }
}

/**
 * The flags the MySQL client is given: `extra.flags`, which TypeORM hands
 * the client in place of `flags`, else `flags`. Read as the client reads
 * them: a string is upper-cased and split on commas, a list is taken as is.
 */
function clientFlags(options: object): string[] {
  const extra: unknown = 'extra' in options ? options.extra : undefined;
  const flags: unknown =
    typeof extra === 'object' && extra !== null && 'flags' in extra
      ? extra.flags
      : 'flags' in options
        ? options.flags
        : undefined;

  if (typeof flags === 'string') {
    return flags.toUpperCase().split(/\s*,+\s*/);
  }
  return Array.isArray(flags)
    ? flags.filter((flag): flag is string => typeof flag === 'string')
    : [];
}

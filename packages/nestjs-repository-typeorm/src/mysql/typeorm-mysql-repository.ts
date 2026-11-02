import { type FindManyOptions, type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryFindOptions } from '@concepta/nestjs-repository';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';
import { dataSourceOf } from '../typeorm-repository.util.js';

import { TypeOrmMysqlFoundRowsException } from './typeorm-mysql-found-rows.exception.js';
import { TYPEORM_MYSQL_DATABASE } from './typeorm-mysql.constants.js';

/**
 * A repository on a MySQL data source. Refuses a data source that turns off
 * the `FOUND_ROWS` client flag (on by default).
 */
export class TypeOrmMysqlRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_MYSQL_DATABASE);

    if (
      clientFlags(dataSourceOf(repo.manager).options).includes('-FOUND_ROWS')
    ) {
      throw new TypeOrmMysqlFoundRowsException(this.metadata.name);
    }
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

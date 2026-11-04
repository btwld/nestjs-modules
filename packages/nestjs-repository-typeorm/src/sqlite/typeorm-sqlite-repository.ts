import { type Repository } from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { type TypeOrmRepositoryOptions } from '../repository/typeorm-repository-options.interface.js';
import { TypeOrmRepository } from '../repository/typeorm-repository.js';
import { dataSourceOf } from '../typeorm-repository.util.js';

import { type TypeOrmSqliteGate, gateOf } from './typeorm-sqlite-gate.js';
import {
  SQLITE_TRANSACTION_ENDED_CODES,
  TYPEORM_SQLITE_DATABASE,
} from './typeorm-sqlite.constants.js';

/**
 * A repository on a SQLite data source.
 *
 * The data source has one connection. A statement outside the caller's
 * transaction waits while another caller's transaction holds the
 * connection, instead of running inside it. So every call made while a run
 * is open must carry the run's context: a call without it waits for the
 * run to end, so one the run itself awaits never returns.
 *
 * A failed statement does not end the transaction it ran in, unless the
 * error is one of `SQLITE_TRANSACTION_ENDED_CODES`, after which SQLite may
 * have rolled the whole transaction back and the run fails.
 */
export class TypeOrmSqliteRepository<
  Entity extends PlainLiteralObject,
> extends TypeOrmRepository<Entity> {
  private readonly gate: TypeOrmSqliteGate;

  constructor(repo: Repository<Entity>, options: TypeOrmRepositoryOptions) {
    super(repo, options, TYPEORM_SQLITE_DATABASE);
    this.gate = gateOf(dataSourceOf(repo.manager));
  }

  /**
   * A full database, an I/O error, a busy lock, out of memory or an
   * interrupt: SQLite may have rolled the whole transaction back. Told by
   * the primary code, as better-sqlite3 reports extended ones
   * (`SQLITE_IOERR_WRITE`).
   */
  protected override endsTransaction(error: unknown): boolean {
    const code = this.describeDatabaseError(error)?.code;
    return (
      typeof code === 'string' &&
      SQLITE_TRANSACTION_ENDED_CODES.some(
        (ended) => code === ended || code.startsWith(`${ended}_`),
      )
    );
  }

  /** `work` in a turn of the connection's own. */
  protected override outsideTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.gate.run(work);
  }
}

import { count, getTableName, is, type SQL, type Table } from 'drizzle-orm';
import { type SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { type AppContextLike, RuntimeException } from '@concepta/nestjs-core';
import { type RepositoryDatabaseErrorInterface } from '@concepta/nestjs-repository';

import { columnOf } from '../repository/drizzle-metadata.js';
import { type DrizzleReadQueryInterface } from '../repository/drizzle-read-query.interface.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';
import { DrizzleRepository } from '../repository/drizzle-repository.js';
import { toRows } from '../repository/drizzle-rows.util.js';

import { gateOf } from './drizzle-sqlite-gate.js';
import { DrizzleSqliteTransaction } from './drizzle-sqlite-transaction.js';
import {
  DRIZZLE_SQLITE_DATABASE,
  SQLITE_TRANSACTION_ENDED_CODES,
} from './drizzle-sqlite.constants.js';
import { type DrizzleSqliteClient } from './drizzle-sqlite.types.js';
import { describeSqliteFailure } from './drizzle-sqlite.util.js';

/** A SQLite table, or a refusal naming the table that is not one. */
function sqliteTableOf(table: Table): SQLiteTable {
  if (!is(table, SQLiteTable)) {
    throw new RuntimeException({
      message:
        'The Drizzle SQLite adapter supports SQLite tables only, not "%s"',
      messageParams: [getTableName(table)],
      fault: 'usage',
    });
  }
  return table;
}

/**
 * A repository on a Drizzle SQLite database, through better-sqlite3. Every
 * write returns the rows it wrote with `RETURNING`.
 *
 * The database has one connection. A call outside the caller's
 * transaction waits while another caller's transaction holds the
 * connection, then holds it in turn for its statements; SQLite's write
 * lock, not `FOR UPDATE`, keeps the rows a transaction reads from changing
 * under it.
 *
 * So every call made while a run is open on the connection must carry the
 * run's context: a call without it waits for the run to end, so one the
 * run itself awaits never returns.
 *
 * `LIKE` (`contains`, `starts`, `ends`) matches ASCII letters in either
 * case, while `eq` does not, and `NULL` sorts first ascending: SQLite's own
 * rules, which `PRAGMA case_sensitive_like` changes per connection. A
 * failed statement does not end the transaction it ran in; the run rolls
 * back only when the error leaves it, unless the error is one of
 * `SQLITE_TRANSACTION_ENDED_CODES`, after which SQLite may have rolled the
 * whole transaction back and the run fails. A statement binds at most 32766
 * values, so SQLite refuses a larger `in` list, `createMany` or
 * `deleteMany` as a database error, writing nothing.
 */
export class DrizzleSqliteRepository<
  Entity extends PlainLiteralObject,
> extends DrizzleRepository<Entity, DrizzleSqliteClient> {
  private readonly table: SQLiteTable;

  constructor(options: DrizzleRepositoryOptions<Entity, DrizzleSqliteClient>) {
    super(options, DRIZZLE_SQLITE_DATABASE);
    this.table = sqliteTableOf(options.table);
  }

  private sqliteColumn(key: string): SQLiteColumn {
    return columnOf(this.table, key);
  }

  protected clientOfTransaction(tx: unknown): DrizzleSqliteClient | undefined {
    return tx instanceof DrizzleSqliteTransaction ? tx.getClient() : undefined;
  }

  /**
   * `work` in the caller's transaction, or in a turn of the connection's
   * own, so it never runs inside another caller's transaction.
   */
  protected override async withClient<T>(
    ctx: AppContextLike | undefined,
    work: (client: DrizzleSqliteClient) => Promise<T>,
  ): Promise<T> {
    const { db } = this.options;
    return this.joining(ctx, work, () => gateOf(db).run(() => work(db)));
  }

  /** A query SQLite failed, as `describeSqliteFailure` reports it. */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    return describeSqliteFailure(error);
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

  /**
   * SQLite has no offset without a limit, so a read that skips rows but
   * takes all the rest is given the largest limit, as for MySQL (Drizzle
   * drops SQLite's own `-1`). The lock is SQLite's write lock, held by the
   * transaction, so a locking read is a plain one.
   */
  protected async selectRows(
    client: DrizzleSqliteClient,
    { select, where, order, take, skip }: DrizzleReadQueryInterface,
  ): Promise<PlainLiteralObject[]> {
    let query = (
      select.length > 0
        ? client.select(
            Object.fromEntries(
              select.map((key) => [key, this.sqliteColumn(key)]),
            ),
          )
        : client.select()
    )
      .from(this.table)
      .where(where)
      .$dynamic();
    if (order.length) query = query.orderBy(...order);
    if (take !== undefined) query = query.limit(take);
    else if (skip) query = query.limit(Number.MAX_SAFE_INTEGER);
    if (skip) query = query.offset(skip);
    return toRows(await query);
  }

  protected async countRows(
    client: DrizzleSqliteClient,
    where: SQL | undefined,
  ): Promise<number> {
    const [counted] = await client
      .select({ total: count() })
      .from(this.table)
      .where(where);
    return counted?.total ?? 0;
  }

  protected async insertRows(
    client: DrizzleSqliteClient,
    rows: PlainLiteralObject[],
  ): Promise<PlainLiteralObject[]> {
    return toRows(await client.insert(this.table).values(rows).returning());
  }

  protected async updateRow(
    client: DrizzleSqliteClient,
    set: PlainLiteralObject,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined> {
    const [row] = toRows(
      await client.update(this.table).set(set).where(where).returning(),
    );
    return row;
  }

  protected async deleteRows(
    client: DrizzleSqliteClient,
    where: SQL | undefined,
  ): Promise<number> {
    return toRows(await client.delete(this.table).where(where).returning())
      .length;
  }
}

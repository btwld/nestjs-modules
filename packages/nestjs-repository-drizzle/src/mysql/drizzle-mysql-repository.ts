import { count, getTableName, inArray, is, SQL, type Table } from 'drizzle-orm';
import { type MySqlColumn, MySqlTable } from 'drizzle-orm/mysql-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { columnOf } from '../repository/drizzle-metadata.js';
import { isDrizzleQueryError } from '../repository/drizzle-query-error.util.js';
import { type DrizzleReadQueryInterface } from '../repository/drizzle-read-query.interface.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';
import { DrizzleRepository } from '../repository/drizzle-repository.js';
import { asStored, toRows } from '../repository/drizzle-rows.util.js';

import { DrizzleMysqlTransaction } from './drizzle-mysql-transaction.js';
import {
  DRIZZLE_MYSQL_DATABASE,
  MYSQL_TRANSACTION_ENDED_ERRNOS,
} from './drizzle-mysql.constants.js';
import { type DrizzleMysqlClient } from './drizzle-mysql.types.js';

/** A MySQL table, or a refusal naming the table that is not one. */
function mysqlTableOf(table: Table, database: string): MySqlTable {
  if (!is(table, MySqlTable)) {
    throw new RuntimeException({
      message: 'The Drizzle %s adapter supports MySQL tables only, not "%s"',
      messageParams: [database, getTableName(table)],
      fault: 'usage',
    });
  }
  return table;
}

/**
 * A primary key as text, so the same integer key matches however the
 * client holds it: an `insertId` as a number, or as a string above 2^53,
 * and the key read back as a number, `bigint` or string.
 */
function keyText(value: unknown): string | undefined {
  return typeof value === 'number' ||
    typeof value === 'bigint' ||
    (typeof value === 'string' && /^-?\d+$/.test(value))
    ? String(value)
    : asStored(value);
}

/** The MySQL error number of a failed query, if it has one. */
function errnoOf(error: unknown): unknown {
  return isDrizzleQueryError(error) &&
    error.cause instanceof Error &&
    'errno' in error.cause
    ? error.cause.errno
    : undefined;
}

/**
 * A repository on a Drizzle MySQL database, through the mysql2 client.
 *
 * MySQL returns no rows from a write, so a write reads its rows back by
 * primary key, in the caller's transaction or one of its own. A row inserted
 * without its key gets one the driver can read back: a `$defaultFn` key is
 * generated before the insert, and an auto-increment key is read from the
 * insert of that row alone. Any other key the database generates is
 * refused.
 */
export class DrizzleMysqlRepository<
  Entity extends PlainLiteralObject,
> extends DrizzleRepository<Entity, DrizzleMysqlClient> {
  protected readonly returnsWrittenRows = false;

  private readonly table: MySqlTable;

  /**
   * @param options - The registration, its connection's database and its
   *   metadata
   * @param database - The database the adapter is for: `mysql`, or
   *   `mariadb` for the MariaDB adapter, which shares this client
   */
  constructor(
    options: DrizzleRepositoryOptions<Entity, DrizzleMysqlClient>,
    database: string = DRIZZLE_MYSQL_DATABASE,
  ) {
    super(options, database);
    this.table = mysqlTableOf(options.table, database);
  }

  private mysqlColumn(key: string): MySqlColumn {
    return columnOf(this.table, key);
  }

  protected clientOfTransaction(tx: unknown): DrizzleMysqlClient | undefined {
    return tx instanceof DrizzleMysqlTransaction ? tx.getClient() : undefined;
  }

  protected begin<T>(work: (tx: DrizzleMysqlClient) => Promise<T>): Promise<T> {
    return this.options.db.transaction(work);
  }

  /**
   * A deadlock, or a lock table out of memory: MySQL has rolled the whole
   * transaction back.
   */
  protected override endsTransaction(error: unknown): boolean {
    return MYSQL_TRANSACTION_ENDED_ERRNOS.includes(errnoOf(error));
  }

  /**
   * MySQL has no offset without a limit, so a read that skips rows but takes
   * all the rest is given the largest limit, as MySQL's manual suggests.
   */
  protected async selectRows(
    client: DrizzleMysqlClient,
    { select, where, order, take, skip, lock }: DrizzleReadQueryInterface,
  ): Promise<PlainLiteralObject[]> {
    let query = (
      select.length > 0
        ? client.select(
            Object.fromEntries(
              select.map((key) => [key, this.mysqlColumn(key)]),
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
    if (lock) query = query.for('update');
    return toRows(await query);
  }

  protected async countRows(
    client: DrizzleMysqlClient,
    where: SQL | undefined,
  ): Promise<number> {
    const [counted] = await client
      .select({ total: count() })
      .from(this.table)
      .where(where);
    return counted?.total ?? 0;
  }

  /**
   * One `INSERT` of every row when each has its key, else one per row so
   * each auto-increment key can be read; then the rows, read back by key.
   */
  protected async insertRows(
    client: DrizzleMysqlClient,
    rows: PlainLiteralObject[],
  ): Promise<PlainLiteralObject[]> {
    const primary = this.primaryColumn('create');
    const keyed = rows.map((row) => this.withKey(row, primary.key));
    const keys: unknown[] = [];

    if (keyed.every((row) => row[primary.key] !== undefined)) {
      await client.insert(this.table).values(keyed);
      keys.push(...keyed.map((row) => row[primary.key]));
    } else {
      for (const row of keyed) {
        const [header] = await client.insert(this.table).values(row);
        keys.push(row[primary.key] ?? header.insertId);
      }
    }

    const stored = await this.selectRows(client, {
      select: [],
      where: inArray(primary.column, keys),
      order: [],
    });
    const byKey = new Map(
      stored.map((row) => [keyText(row[primary.key]), row]),
    );
    return keys.flatMap((key) => byKey.get(keyText(key)) ?? []);
  }

  /**
   * `row` with a primary key the driver can read back: its own, one its
   * key's `$defaultFn` generates, or none for an auto-increment key.
   */
  private withKey(row: PlainLiteralObject, key: string): PlainLiteralObject {
    if (row[key] !== undefined) return row;
    const column = this.mysqlColumn(key);
    if ('autoIncrement' in column && column.autoIncrement === true) return row;

    const generated = column.defaultFn?.();
    if (generated !== undefined && !is(generated, SQL)) {
      return { ...row, [key]: generated };
    }
    throw new RuntimeException({
      message:
        'Cannot create "%s" without its key: MySQL returns no row from an ' +
        'insert, and "%s" is neither auto-increment nor generated by ' +
        '$defaultFn, so the driver cannot read the row back',
      messageParams: [this.metadata.name, key],
      fault: 'usage',
    });
  }

  /**
   * The `UPDATE`, then the row read back with a locking read: a plain read
   * in a transaction that has read before returns its snapshot, not a row
   * another transaction has committed since, unless this `UPDATE` changed
   * it.
   */
  protected async updateRow(
    client: DrizzleMysqlClient,
    set: PlainLiteralObject,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined> {
    await client.update(this.table).set(set).where(where);
    const [row] = await this.selectRows(client, {
      select: [],
      where,
      order: [],
      lock: true,
    });
    return row;
  }

  protected async deleteRows(
    client: DrizzleMysqlClient,
    where: SQL | undefined,
  ): Promise<number> {
    const [header] = await client.delete(this.table).where(where);
    return header.affectedRows;
  }
}

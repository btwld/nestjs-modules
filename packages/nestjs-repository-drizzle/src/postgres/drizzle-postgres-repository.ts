import { count, getTableName, is, type SQL, type Table } from 'drizzle-orm';
import { type PgColumn, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  AppContextHost,
  type AppContextLike,
  RuntimeException,
} from '@concepta/nestjs-core';

import { columnOf } from '../repository/drizzle-metadata.js';
import { isDrizzleQueryError } from '../repository/drizzle-query-error.util.js';
import { type DrizzleReadQueryInterface } from '../repository/drizzle-read-query.interface.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';
import { DrizzleRepository } from '../repository/drizzle-repository.js';
import { toRows } from '../repository/drizzle-rows.util.js';

import { type DrizzlePostgresTransactionSettingsResolver } from './drizzle-postgres-transaction-settings-resolver.type.js';
import { DrizzlePostgresTransaction } from './drizzle-postgres-transaction.js';
import { DRIZZLE_POSTGRES_DATABASE } from './drizzle-postgres.constants.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';
import { applyTransactionSettings } from './drizzle-postgres.util.js';

/** A Postgres table, or a refusal naming the table that is not one. */
function pgTableOf(table: Table): PgTable {
  if (!is(table, PgTable)) {
    throw new RuntimeException({
      message:
        'The Drizzle Postgres adapter supports Postgres tables only, ' +
        'not "%s"',
      messageParams: [getTableName(table)],
      fault: 'usage',
    });
  }
  return table;
}

/**
 * A repository on a Drizzle Postgres database. Every write returns the rows
 * it wrote with `RETURNING`.
 */
export class DrizzlePostgresRepository<
  Entity extends PlainLiteralObject,
> extends DrizzleRepository<Entity, DrizzlePostgresClient> {
  protected readonly returnsWrittenRows = true;

  private readonly table: PgTable;

  /**
   * @param options - The registration, its connection's database and its
   *   metadata
   * @param transactionSettings - Settings applied at the start of every
   *   transaction the repository opens itself
   */
  constructor(
    options: DrizzleRepositoryOptions<Entity, DrizzlePostgresClient>,
    private readonly transactionSettings?: DrizzlePostgresTransactionSettingsResolver,
  ) {
    super(options, DRIZZLE_POSTGRES_DATABASE);
    this.table = pgTableOf(options.table);
  }

  private pgColumn(key: string): PgColumn {
    return columnOf(this.table, key);
  }

  protected clientOfTransaction(
    tx: unknown,
  ): DrizzlePostgresClient | undefined {
    return tx instanceof DrizzlePostgresTransaction
      ? tx.getClient()
      : undefined;
  }

  protected begin<T>(
    work: (tx: DrizzlePostgresClient) => Promise<T>,
    ctx: AppContextLike | undefined,
  ): Promise<T> {
    const settings =
      this.transactionSettings?.(
        AppContextHost.from(ctx),
        this.options.connection,
      ) ?? {};
    return this.options.db.transaction(async (tx) => {
      await applyTransactionSettings(tx, settings);
      return work(tx);
    });
  }

  /**
   * Any failed statement: Postgres ends the transaction it ran in, and
   * answers a later `COMMIT` with a rollback.
   */
  protected override endsTransaction(error: unknown): boolean {
    return isDrizzleQueryError(error);
  }

  protected async selectRows(
    client: DrizzlePostgresClient,
    { select, where, order, take, skip, lock }: DrizzleReadQueryInterface,
  ): Promise<PlainLiteralObject[]> {
    let query = (
      select.length > 0
        ? client.select(
            Object.fromEntries(select.map((key) => [key, this.pgColumn(key)])),
          )
        : client.select()
    )
      .from(this.table)
      .where(where)
      .$dynamic();
    if (order.length) query = query.orderBy(...order);
    if (take !== undefined) query = query.limit(take);
    if (skip) query = query.offset(skip);
    if (lock) query = query.for('update');
    return toRows(await query);
  }

  protected async countRows(
    client: DrizzlePostgresClient,
    where: SQL | undefined,
  ): Promise<number> {
    const [counted] = await client
      .select({ total: count() })
      .from(this.table)
      .where(where);
    return counted?.total ?? 0;
  }

  protected async insertRows(
    client: DrizzlePostgresClient,
    rows: PlainLiteralObject[],
  ): Promise<PlainLiteralObject[]> {
    return toRows(await client.insert(this.table).values(rows).returning());
  }

  protected async updateRow(
    client: DrizzlePostgresClient,
    set: PlainLiteralObject,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined> {
    const [row] = toRows(
      await client.update(this.table).set(set).where(where).returning(),
    );
    return row;
  }

  protected async deleteRows(
    client: DrizzlePostgresClient,
    where: SQL | undefined,
  ): Promise<number> {
    return toRows(await client.delete(this.table).where(where).returning())
      .length;
  }
}

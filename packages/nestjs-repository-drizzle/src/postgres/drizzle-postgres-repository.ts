import {
  count,
  getTableName,
  is,
  type SQL,
  sql,
  type Table,
} from 'drizzle-orm';
import { type PgColumn, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { columnOf } from '../repository/drizzle-metadata.js';
import { type DrizzleReadQueryInterface } from '../repository/drizzle-read-query.interface.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';
import { DrizzleRepository } from '../repository/drizzle-repository.js';
import { toRows } from '../repository/drizzle-rows.util.js';

import { DrizzlePostgresTransaction } from './drizzle-postgres-transaction.js';
import { DRIZZLE_POSTGRES_DATABASE } from './drizzle-postgres.constants.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

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

  constructor(
    options: DrizzleRepositoryOptions<Entity, DrizzlePostgresClient>,
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
  ): Promise<T> {
    return this.options.db.transaction(work);
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

  protected async insertIfAbsent(
    tx: DrizzlePostgresClient,
    row: PlainLiteralObject,
  ): Promise<PlainLiteralObject | undefined> {
    const primary = this.primaryColumn('upsert');
    const [inserted] = toRows(
      await tx
        .insert(this.table)
        .values(row)
        .onConflictDoNothing({ target: this.pgColumn(primary.key) })
        .returning(),
    );
    return inserted;
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

  /** One `INSERT … ON CONFLICT DO UPDATE`, on the primary key only. */
  protected override async upsertRow(
    client: DrizzlePostgresClient,
    row: PlainLiteralObject,
    changes: PlainLiteralObject,
  ): Promise<PlainLiteralObject | undefined> {
    const primary = this.primaryColumn('upsert');
    const target = this.pgColumn(primary.key);
    // A payload of only its key still updates, so the row is returned.
    const set =
      Object.keys(changes).length > 0
        ? changes
        : { [primary.key]: sql`excluded.${sql.identifier(target.name)}` };
    const [upserted] = toRows(
      await client
        .insert(this.table)
        .values(row)
        .onConflictDoUpdate({ target, set })
        .returning(),
    );
    return upserted;
  }

  protected async deleteRows(
    client: DrizzlePostgresClient,
    where: SQL | undefined,
  ): Promise<number> {
    return toRows(await client.delete(this.table).where(where).returning())
      .length;
  }
}

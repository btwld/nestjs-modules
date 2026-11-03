import {
  and,
  asc,
  between,
  type Column,
  desc,
  count,
  DrizzleQueryError,
  eq,
  gt,
  gte,
  inArray,
  is,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  type SQL,
  sql,
  type Table,
} from 'drizzle-orm';
import { type PgColumn, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject } from '@nestjs/common';

import {
  AppContextHost,
  type AppContextLike,
  type DeepPartial,
  RuntimeException,
} from '@concepta/nestjs-core';
import {
  EntityNotFoundException,
  isWhereCompound,
  isWhereNever,
  OptimisticLockException,
  RepositoryAdapter,
  type RepositoryCountOptions,
  type RepositoryCreateOptions,
  type RepositoryDatabaseErrorInterface,
  type RepositoryDeleteOneOptions,
  type RepositoryDeleteOptions,
  type RepositoryFindOneOptions,
  type RepositoryFindOptions,
  type RepositoryMetadataInterface,
  type RepositoryRestoreOptions,
  type RepositoryUpdateOptions,
  type RepositoryUpsertOptions,
  type RepositoryVersionGuardOptions,
  SortOrder,
  TrxCtx,
  type WhereClause,
  type WhereCondition,
  WhereCompoundOperator,
  WhereOperator,
} from '@concepta/nestjs-repository';

import { columnOf } from '../repository/drizzle-metadata.js';
import { type DrizzleRepositoryOptions } from '../repository/drizzle-repository-options.interface.js';

import { DrizzlePostgresTransaction } from './drizzle-postgres-transaction.js';
import { DRIZZLE_POSTGRES_DATABASE } from './drizzle-postgres.constants.js';
import { type DrizzlePostgresClient } from './drizzle-postgres.types.js';

/** A row as the database returned it. */
function isRow(value: unknown): value is PlainLiteralObject {
  return typeof value === 'object' && value !== null;
}

/** Rows as the database returned them. */
function toRows(values: unknown): PlainLiteralObject[] {
  return Array.isArray(values) ? values.filter(isRow) : [];
}

/**
 * A value as Drizzle read it, as one string, for telling whether a write
 * changed it. A `bigint` is kept apart from a string holding the same
 * digits, and `NaN` and the infinities from `null`.
 */
function asStored(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, each: unknown) => {
    if (typeof each === 'bigint') return { bigint: each.toString() };
    if (typeof each === 'number' && !Number.isFinite(each)) {
      return { number: String(each) };
    }
    return each;
  });
}

/** A Postgres table, or a refusal naming the table that is not one. */
function pgTableOf(table: Table): PgTable {
  if (!is(table, PgTable)) {
    throw new RuntimeException({
      message:
        'The Drizzle Postgres adapter supports Postgres tables only, ' +
        'not "%s"',
      messageParams: [String(table)],
      fault: 'usage',
    });
  }
  return table;
}

/**
 * Drizzle implementation of RepositoryInterface, for Postgres.
 *
 * Every read and unversioned write is one statement on the entity's own
 * table. A write to a versioned row reads the row first, in the caller's
 * transaction or one of its own, so the version moves on only when the row
 * changes. The driver reports no relations, so no read it is given joins
 * one.
 */
export class DrizzlePostgresRepository<
  Entity extends PlainLiteralObject,
> extends RepositoryAdapter<Entity> {
  readonly metadata: RepositoryMetadataInterface<Entity>;

  private readonly table: PgTable;

  constructor(
    private readonly options: DrizzleRepositoryOptions<
      Entity,
      DrizzlePostgresClient
    >,
  ) {
    super(options.entityKey, options.hookResolver);
    this.metadata = options.metadata;
    this.table = pgTableOf(options.table);
  }

  /**
   * The key of the transaction this repository's reads and writes join.
   */
  get transactionKey(): string | undefined {
    return this.options.transactionKey;
  }

  /**
   * A query the database failed, reported with the database client's own
   * error code.
   */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    if (!(error instanceof DrizzleQueryError)) return undefined;
    const reported = error.cause;
    const code =
      reported &&
      'code' in reported &&
      (typeof reported.code === 'string' || typeof reported.code === 'number')
        ? reported.code
        : undefined;
    return {
      database: DRIZZLE_POSTGRES_DATABASE,
      code,
      message: reported?.message ?? error.message,
    };
  }

  /**
   * The database to run on: the caller's transaction when it has one.
   */
  private async client(ctx?: AppContextLike): Promise<DrizzlePostgresClient> {
    return (await this.transaction(ctx)) ?? this.options.db;
  }

  /** The caller's transaction on this connection, when it has one. */
  private async transaction(
    ctx?: AppContextLike,
  ): Promise<DrizzlePostgresClient | undefined> {
    const { transactionKey } = this.options;
    if (transactionKey) {
      const context = AppContextHost.from(ctx);
      if (context.supports(TrxCtx)) {
        const { trx } = context.with(TrxCtx);
        if (trx?.isSupported) {
          const tx = await trx.getOrStart(transactionKey);
          if (!(tx instanceof DrizzlePostgresTransaction)) {
            throw new RuntimeException({
              message: 'Transaction "%s" is not a Drizzle Postgres transaction',
              messageParams: [transactionKey],
              fault: 'internal',
            });
          }
          return tx.getClient();
        }
      }
    }
    return undefined;
  }

  /**
   * Run `work` in the caller's transaction, or in one of its own when the
   * caller has none. Never in a savepoint: a failure fails the caller's
   * transaction, as any other failed statement in it does.
   */
  private async atomically<T>(
    ctx: AppContextLike | undefined,
    work: (tx: DrizzlePostgresClient) => Promise<T>,
  ): Promise<T> {
    const open = await this.transaction(ctx);
    return open ? work(open) : this.options.db.transaction(work);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Columns
  // ═══════════════════════════════════════════════════════════════════════════

  private column(key: string): PgColumn {
    return columnOf(this.table, key);
  }

  private primaryColumn(operation: string): {
    key: keyof Entity & string;
    column: PgColumn;
  } {
    const key = this.getPrimaryColumn();
    if (key === undefined) {
      throw new RuntimeException({
        message: 'Cannot %s "%s": the entity has no primary key column',
        messageParams: [operation, this.metadata.name],
        fault: 'usage',
      });
    }
    return { key, column: this.column(key) };
  }

  /** The rows that are not soft deleted, unless the read wants them. */
  private live(withDeleted: boolean | undefined): SQL | undefined {
    const removeDate = this.getDeleteDateColumn();
    if (withDeleted || removeDate === undefined) return undefined;
    return isNull(this.column(removeDate));
  }

  /**
   * A read's join, `where` and order hold only own columns: the driver
   * reports no relations, so the repository refuses a read naming one before
   * it gets here.
   */
  private unjoinable(relation: string): RuntimeException {
    return new RuntimeException({
      message: 'Relation "%s" of "%s" reached the Drizzle driver',
      messageParams: [relation, this.metadata.name],
      fault: 'internal',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause → SQL
  // ═══════════════════════════════════════════════════════════════════════════

  private translateWhere(clause: WhereClause): SQL {
    if (isWhereNever(clause)) return sql`1 = 0`;

    if (isWhereCompound(clause)) {
      // An empty AND matches nothing, as an empty OR does: the repository
      // fails a hand-built clause with no conditions closed, never open.
      const parts = clause.conditions.map((condition) =>
        this.translateWhere(condition),
      );
      const joined =
        clause.operator === WhereCompoundOperator.AND
          ? and(...parts)
          : or(...parts);
      return joined ?? sql`1 = 0`;
    }

    if (clause.relation !== undefined) throw this.unjoinable(clause.relation);

    return this.translateCondition(this.column(clause.field), clause);
  }

  private translateCondition(column: Column, cond: WhereCondition): SQL {
    const { operator } = cond;
    switch (operator) {
      case WhereOperator.EQ:
        return eq(column, cond.value);
      case WhereOperator.NE:
        return ne(column, cond.value);
      case WhereOperator.GT:
        return gt(column, cond.value);
      case WhereOperator.GTE:
        return gte(column, cond.value);
      case WhereOperator.LT:
        return lt(column, cond.value);
      case WhereOperator.LTE:
        return lte(column, cond.value);
      case WhereOperator.CONTAINS:
        return this.like(column, '%', cond.value, '%');
      case WhereOperator.NCONTAINS:
        return this.like(column, '%', cond.value, '%', true);
      case WhereOperator.STARTS:
        return this.like(column, '', cond.value, '%');
      case WhereOperator.NSTARTS:
        return this.like(column, '', cond.value, '%', true);
      case WhereOperator.ENDS:
        return this.like(column, '%', cond.value, '');
      case WhereOperator.NENDS:
        return this.like(column, '%', cond.value, '', true);
      case WhereOperator.IN:
        return cond.value.length ? inArray(column, cond.value) : sql`1 = 0`;
      case WhereOperator.NIN:
        return cond.value.length ? notInArray(column, cond.value) : sql`1 = 1`;
      case WhereOperator.IS_NULL:
        return isNull(column);
      case WhereOperator.NOT_NULL:
        return isNotNull(column);
      case WhereOperator.BETWEEN:
        return between(column, cond.value[0], cond.value[1]);
      default: {
        const _exhaustive: never = operator;
        void _exhaustive;
        throw new RuntimeException({
          message: 'Unknown where operator "%s"',
          messageParams: [operator],
          fault: 'internal',
        });
      }
    }
  }

  /**
   * `LIKE` matching `value` between `before` and `after`, with `%`, `_` and
   * the escape character in `value` matched as themselves.
   */
  private like(
    column: Column,
    before: string,
    value: string,
    after: string,
    negated = false,
  ): SQL {
    const pattern = `${before}${value.replace(/[!%_]/g, '!$&')}${after}`;
    return negated
      ? sql`${column} not like ${pattern} escape '!'`
      : sql`${column} like ${pattern} escape '!'`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reads
  // ═══════════════════════════════════════════════════════════════════════════

  /** A read's `where`, with soft-deleted rows left out unless it wants them. */
  private whereOf(options: RepositoryCountOptions): SQL | undefined {
    const [join] = options.join ?? [];
    if (join) throw this.unjoinable(join.relation);
    return and(
      this.live(options.withDeleted),
      options.where && this.translateWhere(options.where),
    );
  }

  private async read(
    options: RepositoryFindOptions<Entity>,
  ): Promise<Entity[]> {
    const client = await this.client(options.ctx);
    const order = (options.order ?? []).map(({ field, order, relation }) => {
      if (relation !== undefined) throw this.unjoinable(relation);
      return order === SortOrder.DESC
        ? desc(this.column(field))
        : asc(this.column(field));
    });
    const select = options.select?.map(String) ?? [];

    let query = (
      select.length > 0
        ? client.select(
            Object.fromEntries(select.map((key) => [key, this.column(key)])),
          )
        : client.select()
    )
      .from(this.table)
      .where(this.whereOf(options))
      .$dynamic();
    if (order.length) query = query.orderBy(...order);
    if (options.take !== undefined) query = query.limit(options.take);
    if (options.skip) query = query.offset(options.skip);

    return toRows(await query).map((row) => this.toEntity(row));
  }

  protected async doFind(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<Entity[]> {
    return this.read(options);
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    const [row] = await this.read({ ...options, take: 1 });
    return row ?? null;
  }

  protected async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    const client = await this.client(options.ctx);
    const [counted] = await client
      .select({ total: count() })
      .from(this.table)
      .where(this.whereOf(options));
    return counted?.total ?? 0;
  }

  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const rows = await this.read(options);
    const total = await this.doCount({
      where: options.where,
      withDeleted: options.withDeleted,
      ctx: options.ctx,
    });
    return [rows, total];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Writes
  // ═══════════════════════════════════════════════════════════════════════════

  /** The values to insert: a new row starts at version 1. */
  private toInsert(
    entity: PlainLiteralObject | DeepPartial<Entity>,
  ): PlainLiteralObject {
    const values: PlainLiteralObject = { ...entity };
    const version = this.getVersionColumn();
    if (version !== undefined) values[version] = 1;
    return values;
  }

  /** The row `key` names, locked until the transaction ends. */
  private async lockRow(
    tx: DrizzlePostgresClient,
    key: unknown,
  ): Promise<PlainLiteralObject | undefined> {
    if (key === undefined) return undefined;
    const primary = this.primaryColumn('lock a row');
    const [row] = toRows(
      await tx
        .select()
        .from(this.table)
        .where(eq(primary.column, key))
        .for('update'),
    );
    return row;
  }

  /**
   * `after`, with its version moved on when it holds a different value in
   * one of `keys` than `before`, the same row read before the write.
   *
   * Both rows are as the database stored them, so a value it rounds or
   * normalizes on the way in (`numeric(10,2)`, `timestamp(0)`, `jsonb`)
   * compares as stored, whatever the caller sent.
   */
  private async bumpIfChanged(
    tx: DrizzlePostgresClient,
    before: PlainLiteralObject,
    after: PlainLiteralObject,
    keys: string[],
  ): Promise<PlainLiteralObject> {
    const version = this.getVersionColumn();
    if (
      version === undefined ||
      keys.every((key) => asStored(before[key]) === asStored(after[key]))
    ) {
      return after;
    }

    const primary = this.primaryColumn('version a row');
    const column = this.column(version);
    const [bumped] = toRows(
      await tx
        .update(this.table)
        .set({ [version]: sql`${column} + 1` })
        .where(eq(primary.column, after[primary.key]))
        .returning(),
    );
    return bumped ?? after;
  }

  protected async doCreate(
    entity: DeepPartial<Entity>,
    options?: RepositoryCreateOptions,
  ): Promise<Entity> {
    const [created] = await this.doCreateMany([entity], options);
    if (!created) {
      throw new RuntimeException({
        message: 'Create of "%s" returned no row',
        messageParams: [this.metadata.name],
        fault: 'internal',
      });
    }
    return created;
  }

  protected async doCreateMany(
    entities: DeepPartial<Entity>[],
    options?: RepositoryCreateOptions,
  ): Promise<Entity[]> {
    if (entities.length === 0) return [];
    const client = await this.client(options?.ctx);
    const rows = toRows(
      await client
        .insert(this.table)
        .values(entities.map((entity) => this.toInsert(entity)))
        .returning(),
    );
    return rows.map((row) => this.toEntity(row));
  }

  /**
   * An `UPDATE` of the row `entity`'s primary key names, at the guarded
   * version when there is a guard, returning the row as stored. No row
   * matched means the row is gone, or, under a guard, written since.
   */
  private async write(
    entity: Entity,
    data: PlainLiteralObject,
    operation: string,
    options:
      | (RepositoryVersionGuardOptions<Entity> & { ctx?: AppContextLike })
      | undefined,
  ): Promise<Entity> {
    const primary = this.primaryColumn(operation);
    const guard = options?.versionGuard;
    const key = entity[primary.key];
    const where = and(
      eq(primary.column, key),
      guard && eq(this.column(guard.column), guard.value),
    );
    const version = this.getVersionColumn();

    let row: PlainLiteralObject | undefined;
    if (Object.keys(data).length === 0 && !guard) {
      row = await this.readRow(await this.client(options?.ctx), where);
    } else if (version === undefined) {
      row = await this.updateRow(await this.client(options?.ctx), data, where);
    } else {
      row = await this.atomically(options?.ctx, (tx) =>
        this.updateVersioned(tx, key, data, where, version),
      );
    }
    if (row) return this.toEntity(row);

    if (guard) throw new OptimisticLockException(this.metadata.name);
    throw new EntityNotFoundException(this.metadata.name, operation);
  }

  /** The row `where` matches, unwritten: a write of nothing, unguarded. */
  private async readRow(
    client: DrizzlePostgresClient,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined> {
    const [row] = toRows(await client.select().from(this.table).where(where));
    return row;
  }

  /** An `UPDATE` of the row `where` matches, returning it as stored. */
  private async updateRow(
    client: DrizzlePostgresClient,
    data: PlainLiteralObject,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined> {
    const [row] = toRows(
      await client.update(this.table).set(data).where(where).returning(),
    );
    return row;
  }

  /**
   * The `UPDATE` of a versioned row: locked and read first, so the version
   * moves on only when the write changed it. With nothing to write it still
   * runs, so a guard is checked.
   */
  private async updateVersioned(
    tx: DrizzlePostgresClient,
    key: unknown,
    data: PlainLiteralObject,
    where: SQL | undefined,
    version: string,
  ): Promise<PlainLiteralObject | undefined> {
    const keys = Object.keys(data);
    const before = await this.lockRow(tx, key);
    const after = await this.updateRow(
      tx,
      keys.length > 0 ? data : { [version]: sql`${this.column(version)}` },
      where,
    );
    return before && after
      ? this.bumpIfChanged(tx, before, after, keys)
      : after;
  }

  protected async doUpdate(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    return this.write(entity, this.withoutVersion(data), 'update', options);
  }

  protected async doReplace(
    entity: Entity,
    data: DeepPartial<Entity>,
    options?: RepositoryUpdateOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    return this.write(entity, this.withoutVersion(data), 'replace', options);
  }

  /** `data` without the version column, which only the driver writes. */
  private withoutVersion(data: DeepPartial<Entity>): PlainLiteralObject {
    const values: PlainLiteralObject = { ...data };
    const version = this.getVersionColumn();
    if (version !== undefined) delete values[version];
    return values;
  }

  /**
   * Inserts, or updates the row the payload's primary key names: in one
   * statement, or, for a versioned row, by locking the row, writing it, and
   * moving the version on when that changed it.
   */
  protected async doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    const primary = this.primaryColumn('upsert');
    const data = this.withoutVersion(entity);
    const { [primary.key]: key, ...changes } = data;

    const row =
      this.getVersionColumn() === undefined
        ? await this.upsertOnce(await this.client(options?.ctx), data, changes)
        : await this.atomically(options?.ctx, (tx) =>
            this.upsertVersioned(tx, data, key, changes),
          );
    if (!row) {
      throw new RuntimeException({
        message: 'Upsert of "%s" returned no row',
        messageParams: [this.metadata.name],
        fault: 'internal',
      });
    }
    return this.toEntity(row);
  }

  /** An unversioned upsert: one `INSERT … ON CONFLICT DO UPDATE`. */
  private async upsertOnce(
    client: DrizzlePostgresClient,
    data: PlainLiteralObject,
    changes: PlainLiteralObject,
  ): Promise<PlainLiteralObject | undefined> {
    const primary = this.primaryColumn('upsert');
    // A payload of only its key still updates, so the row is returned.
    const set =
      Object.keys(changes).length > 0
        ? changes
        : {
            [primary.key]: sql`excluded.${sql.identifier(primary.column.name)}`,
          };
    const [row] = toRows(
      await client
        .insert(this.table)
        .values(data)
        .onConflictDoUpdate({ target: primary.column, set })
        .returning(),
    );
    return row;
  }

  /**
   * A versioned upsert: the row `key` names is locked and updated when it
   * exists; otherwise inserted, unless another transaction inserted it
   * first, which is then locked and updated in turn.
   */
  private async upsertVersioned(
    tx: DrizzlePostgresClient,
    data: PlainLiteralObject,
    key: unknown,
    changes: PlainLiteralObject,
  ): Promise<PlainLiteralObject | undefined> {
    const primary = this.primaryColumn('upsert');
    let before = await this.lockRow(tx, key);
    if (!before) {
      const [inserted] = toRows(
        await tx
          .insert(this.table)
          .values(this.toInsert(data))
          .onConflictDoNothing({ target: primary.column })
          .returning(),
      );
      if (inserted) return inserted;
      before = await this.lockRow(tx, key);
      if (!before) return undefined;
    }

    const keys = Object.keys(changes);
    if (keys.length === 0) return before;
    const [after] = toRows(
      await tx
        .update(this.table)
        .set(changes)
        .where(eq(primary.column, key))
        .returning(),
    );
    return after && this.bumpIfChanged(tx, before, after, keys);
  }

  protected async doDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    const client = await this.client(options?.ctx);
    const primary = this.primaryColumn('delete');
    const guard = options?.versionGuard;
    const rows = toRows(
      await client
        .delete(this.table)
        .where(
          and(
            eq(primary.column, entity[primary.key]),
            guard && eq(this.column(guard.column), guard.value),
          ),
        )
        .returning(),
    );
    if (rows.length === 0 && guard) {
      throw new OptimisticLockException(this.metadata.name);
    }
    return this.toEntity(entity);
  }

  protected async doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    if (entities.length === 0) return [];
    const client = await this.client(options?.ctx);
    const primary = this.primaryColumn('deleteMany');
    await client.delete(this.table).where(
      inArray(
        primary.column,
        entities.map((entity) => entity[primary.key]),
      ),
    );
    return entities.map((entity) => this.toEntity(entity));
  }

  protected async doSoftDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    return this.write(
      entity,
      { [this.removeDateColumn('softDelete')]: new Date() },
      'softDelete',
      options,
    );
  }

  protected async doRestore(
    entity: Entity,
    options?: RepositoryRestoreOptions & RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    return this.write(
      entity,
      { [this.removeDateColumn('restore')]: null },
      'restore',
      options,
    );
  }

  private removeDateColumn(operation: string): string {
    const column = this.getDeleteDateColumn();
    if (column === undefined) {
      throw new RuntimeException({
        message: 'Cannot %s "%s": the entity has no remove date column',
        messageParams: [operation, this.metadata.name],
        fault: 'usage',
      });
    }
    return column;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════════════════════════════════════

  /** `values` as an instance of the entity class, holding nothing else. */
  private toEntity(values: PlainLiteralObject | DeepPartial<Entity>): Entity {
    const entity: Entity = Object.create(this.metadata.type.prototype);
    return Object.assign(entity, values);
  }
}

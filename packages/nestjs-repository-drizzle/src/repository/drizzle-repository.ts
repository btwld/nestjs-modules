import {
  and,
  asc,
  between,
  type Column,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';

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

import { type DrizzleClaimedRowInterface } from './drizzle-claimed-row.interface.js';
import { columnOf } from './drizzle-metadata.js';
import { isDrizzleQueryError } from './drizzle-query-error.util.js';
import { type DrizzleReadQueryInterface } from './drizzle-read-query.interface.js';
import { type DrizzleRepositoryOptions } from './drizzle-repository-options.interface.js';
import { asStored } from './drizzle-rows.util.js';

/**
 * Drizzle implementation of RepositoryInterface, shared by every database's
 * adapter. Each adapter subclasses it with the statements its dialect
 * builds; everything else — translation, versions, soft delete,
 * transactions — is here.
 *
 * Every read, and every write but an upsert that a database can return rows
 * from, is one statement on the entity's own table. An upsert, and a write
 * to a versioned row, lock the row first, in the caller's transaction or one
 * of their own, so an upsert updates only the columns its payload holds and
 * a version moves on only when the row changes. The driver reports no
 * relations, so no read it is given joins one.
 */
export abstract class DrizzleRepository<
  Entity extends PlainLiteralObject,
  Client,
> extends RepositoryAdapter<Entity> {
  readonly metadata: RepositoryMetadataInterface<Entity>;

  /**
   * Whether the database returns the rows a write changed. Without it, a
   * write reads them back in the same transaction.
   */
  protected abstract readonly returnsWrittenRows: boolean;

  /**
   * @param options - The registration, its connection's database and its
   *   metadata
   * @param database - The database the adapter is for, as its errors name
   *   it
   */
  constructor(
    protected readonly options: DrizzleRepositoryOptions<Entity, Client>,
    private readonly database: string,
  ) {
    super(options.entityKey, options.hookResolver);
    this.metadata = options.metadata;
  }

  /**
   * The key of the transaction this repository's reads and writes join.
   */
  get transactionKey(): string | undefined {
    return this.options.transactionKey;
  }

  /**
   * A query the database failed, reported with the database client's own
   * error and code: `code` where the client sets one, else `errno`. Never
   * Drizzle's own message, which holds the query and its values.
   */
  protected override describeDatabaseError(
    error: unknown,
  ): RepositoryDatabaseErrorInterface | undefined {
    if (!isDrizzleQueryError(error)) return undefined;
    const reported = error.cause instanceof Error ? error.cause : undefined;
    const code =
      reported &&
      'code' in reported &&
      (typeof reported.code === 'string' || typeof reported.code === 'number')
        ? reported.code
        : reported && 'errno' in reported && typeof reported.errno === 'number'
          ? reported.errno
          : undefined;
    return {
      database: this.database,
      code,
      message: reported?.message ?? 'the database client gave no error',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // What each database builds
  // ═══════════════════════════════════════════════════════════════════════════

  /** The client of a transaction, when it is one of this adapter's. */
  protected abstract clientOfTransaction(tx: unknown): Client | undefined;

  /**
   * Run `work` in a new transaction on the connection's database, for the
   * caller `ctx`.
   */
  protected abstract begin<T>(
    work: (tx: Client) => Promise<T>,
    ctx: AppContextLike | undefined,
  ): Promise<T>;

  /** The rows a read selects. */
  protected abstract selectRows(
    client: Client,
    query: DrizzleReadQueryInterface,
  ): Promise<PlainLiteralObject[]>;

  /** How many rows `where` matches. */
  protected abstract countRows(
    client: Client,
    where: SQL | undefined,
  ): Promise<number>;

  /** Insert `rows`, returning them as stored, in the order given. */
  protected abstract insertRows(
    client: Client,
    rows: PlainLiteralObject[],
  ): Promise<PlainLiteralObject[]>;

  /**
   * The row an upsert's `key` names, locked until the transaction ends:
   * the stored one, or `row` inserted when there is none. Nothing when
   * neither can be had. A database without gap locks claims by
   * {@link claimByLock}.
   */
  protected abstract claimRow(
    tx: Client,
    row: PlainLiteralObject,
    key: unknown,
  ): Promise<DrizzleClaimedRowInterface | undefined>;

  /**
   * Update the one row `where` matches with `set`, returning it as stored,
   * or nothing when no row matched.
   */
  protected abstract updateRow(
    client: Client,
    set: PlainLiteralObject,
    where: SQL | undefined,
  ): Promise<PlainLiteralObject | undefined>;

  /** Delete the rows `where` matches, returning how many it deleted. */
  protected abstract deleteRows(
    client: Client,
    where: SQL | undefined,
  ): Promise<number>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Transactions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run `work` on the database: the caller's transaction when it has one,
   * else the connection's database. A database with one connection
   * overrides this to wait while another caller's transaction holds it.
   */
  protected async withClient<T>(
    ctx: AppContextLike | undefined,
    work: (client: Client) => Promise<T>,
  ): Promise<T> {
    return this.joining(ctx, work, () => work(this.options.db));
  }

  /**
   * Run `work` in the caller's transaction on this connection, or
   * `otherwise` when the caller has none.
   */
  protected async joining<T>(
    ctx: AppContextLike | undefined,
    work: (tx: Client) => Promise<T>,
    otherwise: () => Promise<T>,
  ): Promise<T> {
    const { transactionKey } = this.options;
    const context = AppContextHost.from(ctx);
    const trx =
      transactionKey && context.supports(TrxCtx)
        ? context.with(TrxCtx).trx
        : undefined;
    if (!transactionKey || !trx?.isSupported) return otherwise();

    const tx = await trx.getOrStart(transactionKey);
    const client = this.clientOfTransaction(tx);
    if (client === undefined) {
      throw new RuntimeException({
        message: 'Transaction "%s" is not a transaction of the %s adapter',
        messageParams: [transactionKey, this.database],
        fault: 'internal',
      });
    }
    return work(client);
  }

  /**
   * Run `work` in the caller's transaction, or in one of its own when the
   * caller has none. Never in a savepoint: a failure fails the caller's
   * transaction, as any other failed statement in it does.
   */
  protected async atomically<T>(
    ctx: AppContextLike | undefined,
    work: (tx: Client) => Promise<T>,
  ): Promise<T> {
    return this.joining(ctx, work, () => this.begin(work, ctx));
  }

  /**
   * Run a write in the caller's transaction, or in one of its own when the
   * database cannot return the rows it writes and must read them back.
   */
  private async writing<T>(
    ctx: AppContextLike | undefined,
    work: (client: Client) => Promise<T>,
  ): Promise<T> {
    return this.returnsWrittenRows
      ? this.withClient(ctx, work)
      : this.atomically(ctx, work);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Columns
  // ═══════════════════════════════════════════════════════════════════════════

  protected column(key: string): Column {
    return columnOf(this.options.table, key);
  }

  protected primaryColumn(operation: string): {
    key: keyof Entity & string;
    column: Column;
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
    const order = (options.order ?? []).map(({ field, order, relation }) => {
      if (relation !== undefined) throw this.unjoinable(relation);
      return order === SortOrder.DESC
        ? desc(this.column(field))
        : asc(this.column(field));
    });

    const query = {
      select: options.select?.map(String) ?? [],
      where: this.whereOf(options),
      order,
      take: options.take,
      skip: options.skip,
    };
    const rows = await this.withClient(options.ctx, (client) =>
      this.selectRows(client, query),
    );
    return rows.map((row) => this.toEntity(row));
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
    const where = this.whereOf(options);
    return this.withClient(options.ctx, (client) =>
      this.countRows(client, where),
    );
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

  /** The row `where` matches, read as stored. */
  private async readRow(
    client: Client,
    where: SQL | undefined,
    lock = false,
  ): Promise<PlainLiteralObject | undefined> {
    const [row] = await this.selectRows(client, {
      select: [],
      where,
      order: [],
      lock,
    });
    return row;
  }

  /** The row `key` names, locked until the transaction ends. */
  protected async lockRow(
    tx: Client,
    key: unknown,
  ): Promise<PlainLiteralObject | undefined> {
    if (key === undefined) return undefined;
    const primary = this.primaryColumn('lock a row');
    return this.readRow(tx, eq(primary.column, key), true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Writes
  // ═══════════════════════════════════════════════════════════════════════════

  /** The values to insert: a new row starts at version 1. */
  protected toInsert(
    entity: PlainLiteralObject | DeepPartial<Entity>,
  ): PlainLiteralObject {
    const values: PlainLiteralObject = { ...entity };
    const version = this.getVersionColumn();
    if (version !== undefined) values[version] = 1;
    return values;
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
    tx: Client,
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
    const key = after[primary.key];
    const bumped = await this.updateRow(
      tx,
      {
        ...this.keptAsStored([]),
        [version]: sql`${this.column(version)} + 1`,
      },
      eq(primary.column, key),
    );
    return bumped ?? after;
  }

  /**
   * A `SET` of `keys` and every `$onUpdate` column, each to its own stored
   * value: Drizzle adds every `$onUpdate` column to an update it builds, and
   * an update the driver adds must write nothing the caller did not.
   */
  protected keptAsStored(keys: string[]): PlainLiteralObject {
    return Object.fromEntries(
      Object.entries(getTableColumns(this.options.table))
        .filter(
          ([key, column]) =>
            keys.includes(key) || column.onUpdateFn !== undefined,
        )
        .map(([key, column]) => [key, sql`${column}`]),
    );
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
    const rows = await this.writing(options?.ctx, (client) =>
      this.insertRows(
        client,
        entities.map((entity) => this.toInsert(entity)),
      ),
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
      row = await this.withClient(options?.ctx, (client) =>
        this.readRow(client, where),
      );
    } else if (version === undefined) {
      row = await this.writing(options?.ctx, (client) =>
        this.updateRow(client, data, where),
      );
    } else {
      row = await this.atomically(options?.ctx, (tx) =>
        this.updateVersioned(tx, key, data, where, version),
      );
    }
    if (row) return this.toEntity(row);

    if (guard) throw new OptimisticLockException(this.metadata.name);
    throw new EntityNotFoundException(this.metadata.name, operation);
  }

  /**
   * The `UPDATE` of a versioned row: locked and read first, so the version
   * moves on only when the write changed it. With nothing to write it still
   * runs, so a guard is checked.
   */
  private async updateVersioned(
    tx: Client,
    key: unknown,
    data: PlainLiteralObject,
    where: SQL | undefined,
    version: string,
  ): Promise<PlainLiteralObject | undefined> {
    const keys = Object.keys(data);
    const before = await this.lockRow(tx, key);
    const after = await this.updateRow(
      tx,
      keys.length > 0 ? data : this.keptAsStored([version]),
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
   * Inserts the payload, or updates the row its primary key names with the
   * columns it holds: in a transaction, the row claimed and locked, then
   * written, and its version moved on when that changed it. A payload that
   * names a stored row need not hold its other columns.
   */
  protected async doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    const primary = this.primaryColumn('upsert');
    const data = this.withoutVersion(entity);
    const { [primary.key]: key, ...changes } = data;

    const row = await this.atomically(options?.ctx, (tx) =>
      this.upsertClaimed(tx, data, key, changes),
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

  /**
   * The row `key` names, claimed, then updated with `changes` unless the
   * claim inserted it or it already holds them as stored; returned as
   * stored.
   */
  private async upsertClaimed(
    tx: Client,
    data: PlainLiteralObject,
    key: unknown,
    changes: PlainLiteralObject,
  ): Promise<PlainLiteralObject | undefined> {
    const claimed = await this.claimRow(tx, this.toInsert(data), key);
    if (!claimed) return undefined;

    const keys = Object.keys(changes);
    const holdsChanges = keys.every(
      (column) => asStored(changes[column]) === asStored(claimed.row[column]),
    );
    if (claimed.inserted || holdsChanges) return claimed.row;
    const primary = this.primaryColumn('upsert');
    const after = await this.updateRow(tx, changes, eq(primary.column, key));
    return after && this.bumpIfChanged(tx, claimed.row, after, keys);
  }

  /**
   * A claim by lock: the row `key` names, locked, when it exists; else
   * `insertIfAbsent()`'s row, which inserts nothing on a conflict with any
   * unique column. Then the row with the key, inserted first by another
   * transaction and locked in turn; or, when there is none, the conflict was
   * with another row, which a plain insert reports as the database error.
   *
   * Locking before the insert keeps two upserts of a stored row from each
   * holding the shared lock a failed insert leaves, and deadlocking; on a
   * database with gap locks it makes two upserts of a new key deadlock
   * instead.
   */
  protected async claimByLock(
    tx: Client,
    row: PlainLiteralObject,
    key: unknown,
    insertIfAbsent: () => Promise<PlainLiteralObject | undefined>,
  ): Promise<DrizzleClaimedRowInterface | undefined> {
    const stored = await this.lockRow(tx, key);
    if (stored) return { row: stored, inserted: false };
    const inserted = await insertIfAbsent();
    if (inserted) return { row: inserted, inserted: true };
    const raced = await this.lockRow(tx, key);
    if (raced) return { row: raced, inserted: false };
    const [created] = await this.insertRows(tx, [row]);
    return created && { row: created, inserted: true };
  }

  protected async doDelete(
    entity: Entity,
    options?: RepositoryDeleteOneOptions &
      RepositoryVersionGuardOptions<Entity>,
  ): Promise<Entity> {
    const primary = this.primaryColumn('delete');
    const guard = options?.versionGuard;
    const where = and(
      eq(primary.column, entity[primary.key]),
      guard && eq(this.column(guard.column), guard.value),
    );
    const deleted = await this.withClient(options?.ctx, (client) =>
      this.deleteRows(client, where),
    );
    if (deleted === 0 && guard) {
      throw new OptimisticLockException(this.metadata.name);
    }
    return this.toEntity(entity);
  }

  protected async doDeleteMany(
    entities: Entity[],
    options?: RepositoryDeleteOptions,
  ): Promise<Entity[]> {
    if (entities.length === 0) return [];
    const primary = this.primaryColumn('deleteMany');
    const where = inArray(
      primary.column,
      entities.map((entity) => entity[primary.key]),
    );
    await this.withClient(options?.ctx, (client) =>
      this.deleteRows(client, where),
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

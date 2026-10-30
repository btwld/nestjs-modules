import {
  aliasedTable,
  and,
  between,
  type Column,
  count,
  countDistinct,
  DrizzleQueryError,
  eq,
  getColumns,
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
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';

import { type PlainLiteralObject, type Type } from '@nestjs/common';

import {
  AppContextHost,
  type AppContextLike,
  type DeepPartial,
  type HookResolverService,
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

import { type DrizzleClient } from '../drizzle-repository.types.js';
import { DrizzleTransaction } from '../transaction/drizzle-transaction.js';

import { keyOf } from './drizzle-key.util.js';
import { columnOf, type DrizzleRelation } from './drizzle-metadata.js';

/**
 * Options for constructing a DrizzleRepository.
 */
export interface DrizzleRepositoryOptions<Entity extends PlainLiteralObject> {
  entityKey: string;
  db: DrizzleClient;
  table: Table;
  metadata: RepositoryMetadataInterface<Entity>;
  relations: DrizzleRelation[];
  /** The class each related row is built as, by relation name. */
  relationTypes: ReadonlyMap<string, Type>;
  transactionKey?: string;
  hookResolver?: HookResolverService;
}

/** A relation a read joins to filter or order its roots. */
interface FilterJoin {
  table: Table;
  on: SQL;
}

/** A row as the database returned it. */
function isRow(value: unknown): value is PlainLiteralObject {
  return typeof value === 'object' && value !== null;
}

/** Rows as the database returned them. */
function toRows(values: unknown): PlainLiteralObject[] {
  return Array.isArray(values) ? values.filter(isRow) : [];
}

/** A Postgres column, as every column of a Postgres table is. */
function pgColumnOf(table: Table, key: string): PgColumn {
  const column = columnOf(table, key);
  if (!is(column, PgColumn)) {
    throw new RuntimeException({
      message: 'Column "%s" is not a Postgres column',
      messageParams: [key],
      fault: 'internal',
    });
  }
  return column;
}

/** A Postgres table, or a refusal naming the table that is not one. */
function pgTableOf(table: Table): PgTable {
  if (!is(table, PgTable)) {
    throw new RuntimeException({
      message:
        'The Drizzle repository driver supports Postgres tables only, ' +
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
 * A read runs as at most three kinds of query. When its `where` or `order`
 * names a relation, the first left joins those relations and picks the page
 * of root keys. The roots are then read by those keys, or directly when no
 * relation is named. Each joined relation is read last, one query per
 * relation, and attached to its roots. A join therefore never multiplies or
 * narrows the roots, and `skip` and `take` page the roots only.
 */
export class DrizzleRepository<
  Entity extends PlainLiteralObject,
> extends RepositoryAdapter<Entity> {
  readonly metadata: RepositoryMetadataInterface<Entity>;

  private readonly table: PgTable;

  constructor(private readonly options: DrizzleRepositoryOptions<Entity>) {
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
      database: 'postgres',
      code,
      message: reported?.message ?? error.message,
    };
  }

  /**
   * The database to run on: the caller's transaction when it has one.
   */
  private async client(ctx?: AppContextLike): Promise<DrizzleClient> {
    const { transactionKey } = this.options;
    if (transactionKey) {
      const context = AppContextHost.from(ctx);
      if (context.supports(TrxCtx)) {
        const { trx } = context.with(TrxCtx);
        if (trx?.isSupported) {
          const tx = await trx.getOrStart(transactionKey);
          if (tx instanceof DrizzleTransaction) return tx.client;
        }
      }
    }
    return this.options.db;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Columns and relations
  // ═══════════════════════════════════════════════════════════════════════════

  private column(key: string): PgColumn {
    return pgColumnOf(this.table, key);
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

  private relation(name: string): DrizzleRelation {
    const found = this.options.relations.find(
      ({ metadata }) => metadata.name === name,
    );
    if (!found) {
      throw new RuntimeException({
        message: 'Entity "%s" has no relation "%s"',
        messageParams: [this.metadata.name, name],
        fault: 'internal',
      });
    }
    return found;
  }

  /** `table`'s rows that are not soft deleted, unless the read wants them. */
  private live(
    table: Table,
    removeDate: string | undefined,
    withDeleted: boolean | undefined,
  ): SQL | undefined {
    if (withDeleted || removeDate === undefined) return undefined;
    return isNull(columnOf(table, removeDate));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Filtering joins
  // ═══════════════════════════════════════════════════════════════════════════

  /** The relations a `where` or `order` names. */
  private namedRelations(
    where: WhereClause | undefined,
    order: RepositoryFindOptions<Entity>['order'],
  ): Set<string> {
    const names = new Set<string>();
    const visit = (clause: WhereClause): void => {
      if (isWhereNever(clause)) return;
      if (isWhereCompound(clause)) {
        clause.conditions.forEach(visit);
        return;
      }
      if (clause.relation !== undefined) names.add(clause.relation);
    };
    if (where) visit(where);
    for (const key of order ?? []) {
      if (key.relation !== undefined) names.add(key.relation);
    }
    return names;
  }

  /**
   * Left joins for each named relation, under an alias of its own, and the
   * table its columns are read from.
   */
  private filterJoins(
    names: Set<string>,
    withDeleted: boolean | undefined,
  ): { joins: FilterJoin[]; aliases: Map<string, Table> } {
    const joins: FilterJoin[] = [];
    const aliases = new Map<string, Table>();

    for (const name of names) {
      const relation = this.relation(name);
      const target = aliasedTable(relation.target, `j_${name}`);
      const live = this.live(target, relation.targetRemoveDate, withDeleted);

      if (relation.through) {
        const { fromKey, toKey } = relation.through;
        const junction = aliasedTable(relation.through.table, `jt_${name}`);
        const [on] = relation.pairs;
        if (!on) continue;
        joins.push({
          table: junction,
          on: eq(columnOf(junction, fromKey), this.column(on.from)),
        });
        joins.push({
          table: target,
          on:
            and(eq(columnOf(target, on.to), columnOf(junction, toKey)), live) ??
            sql`1 = 1`,
        });
      } else {
        joins.push({
          table: target,
          on:
            and(
              ...relation.pairs.map((pair) =>
                eq(columnOf(target, pair.to), this.column(pair.from)),
              ),
              live,
            ) ?? sql`1 = 1`,
        });
      }

      aliases.set(name, target);
    }

    return { joins, aliases };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhereClause → SQL
  // ═══════════════════════════════════════════════════════════════════════════

  private translateWhere(
    clause: WhereClause,
    aliases: Map<string, Table>,
  ): SQL {
    if (isWhereNever(clause)) return sql`1 = 0`;

    if (isWhereCompound(clause)) {
      const parts = clause.conditions.map((condition) =>
        this.translateWhere(condition, aliases),
      );
      const joined =
        clause.operator === WhereCompoundOperator.AND
          ? and(...parts)
          : or(...parts);
      return (
        joined ??
        (clause.operator === WhereCompoundOperator.AND
          ? sql`1 = 1`
          : sql`1 = 0`)
      );
    }

    const column =
      clause.relation === undefined
        ? this.column(clause.field)
        : columnOf(this.aliasOf(clause.relation, aliases), clause.field);

    return this.translateCondition(column, clause);
  }

  private aliasOf(relation: string, aliases: Map<string, Table>): Table {
    const alias = aliases.get(relation);
    if (!alias) {
      throw new RuntimeException({
        message: 'Relation "%s" of "%s" is filtered on without being joined',
        messageParams: [relation, this.metadata.name],
        fault: 'internal',
      });
    }
    return alias;
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

  /**
   * The rows a read selects, in order and paged, each holding every own
   * column. `withPage` false leaves out `skip` and `take`.
   */
  private async selectRoots(
    client: DrizzleClient,
    options: RepositoryFindOptions<Entity>,
    withPage: boolean,
  ): Promise<PlainLiteralObject[]> {
    const names = this.namedRelations(options.where, options.order);
    const { joins, aliases } = this.filterJoins(names, options.withDeleted);
    const where = and(
      this.live(this.table, this.getDeleteDateColumn(), options.withDeleted),
      options.where && this.translateWhere(options.where, aliases),
    );
    const skip = withPage ? options.skip : undefined;
    const take = withPage ? options.take : undefined;

    if (joins.length === 0) {
      const order = (options.order ?? []).map(({ field, order }) =>
        order === SortOrder.DESC
          ? sql`${this.column(field)} desc`
          : sql`${this.column(field)} asc`,
      );
      let query = client.select().from(this.table).where(where).$dynamic();
      if (order.length) query = query.orderBy(...order);
      if (take !== undefined) query = query.limit(take);
      if (skip) query = query.offset(skip);
      return toRows(await query);
    }

    // Grouped by root, so a to-many join cannot repeat one. A root is
    // ordered by the least of its related values ascending, the greatest
    // descending.
    const primary = this.primaryColumn('read with a joined filter');
    const order = (options.order ?? []).map(({ field, order, relation }) => {
      const column =
        relation === undefined
          ? this.column(field)
          : columnOf(this.aliasOf(relation, aliases), field);
      return order === SortOrder.DESC
        ? sql`max(${column}) desc`
        : sql`min(${column}) asc`;
    });

    let keyQuery = client
      .select({ key: primary.column })
      .from(this.table)
      .$dynamic();
    for (const join of joins) {
      keyQuery = keyQuery.leftJoin(pgTableOf(join.table), join.on);
    }
    keyQuery = keyQuery.where(where).groupBy(primary.column);
    if (order.length) keyQuery = keyQuery.orderBy(...order);
    if (take !== undefined) keyQuery = keyQuery.limit(take);
    if (skip) keyQuery = keyQuery.offset(skip);

    const keys = (await keyQuery).map(({ key }) => key);
    if (keys.length === 0) return [];

    const rows = toRows(
      await client
        .select()
        .from(this.table)
        .where(inArray(primary.column, keys)),
    );
    const position = new Map(keys.map((key, index) => [key, index]));
    return rows.sort(
      (a, b) =>
        (position.get(a[primary.key]) ?? 0) -
        (position.get(b[primary.key]) ?? 0),
    );
  }

  /**
   * Read each joined relation's rows for `roots` and attach them, keyed by
   * relation name.
   */
  private async attachJoined(
    client: DrizzleClient,
    roots: PlainLiteralObject[],
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Map<PlainLiteralObject, PlainLiteralObject>> {
    const joined = new Map<PlainLiteralObject, PlainLiteralObject>(
      roots.map((root) => [root, {}]),
    );

    const filtered = this.namedRelations(options.where, undefined);

    for (const { relation: name } of options.join ?? []) {
      const relation = this.relation(name);
      const many = relation.metadata.cardinality === 'many';
      const related = relation.through
        ? await this.readThrough(client, roots, relation, options.withDeleted)
        : await this.readDirect(client, roots, relation, options.withDeleted);
      const kept = filtered.has(name)
        ? await this.keptRelated(client, roots, relation, options)
        : undefined;

      for (const root of roots) {
        const found = (related.get(root) ?? []).filter(
          (row) => !kept || kept(root, row),
        );
        const values = joined.get(root);
        if (!values) continue;
        values[name] = many ? found : (found[0] ?? null);
      }
    }

    return joined;
  }

  /**
   * Which of a filtered relation's rows the read's `where` keeps for each
   * root: those it holds for, joined as the roots were selected.
   */
  private async keptRelated(
    client: DrizzleClient,
    roots: PlainLiteralObject[],
    relation: DrizzleRelation,
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<(root: PlainLiteralObject, row: PlainLiteralObject) => boolean> {
    const primary = this.primaryColumn('filter a joined relation');
    const targetKey = relation.metadata.targetColumns.find(
      ({ isPrimary }) => isPrimary,
    )?.name;
    if (targetKey === undefined) {
      throw new RuntimeException({
        message:
          'Cannot filter relation "%s" of "%s": its target has no primary key',
        messageParams: [relation.metadata.name, this.metadata.name],
        fault: 'usage',
      });
    }

    if (roots.length === 0) return () => false;

    const names = this.namedRelations(options.where, undefined);
    const { joins, aliases } = this.filterJoins(names, options.withDeleted);
    const target = this.aliasOf(relation.metadata.name, aliases);

    let query = client
      .select({
        root: primary.column,
        related: pgColumnOf(target, targetKey),
      })
      .from(this.table)
      .$dynamic();
    for (const join of joins) {
      query = query.leftJoin(pgTableOf(join.table), join.on);
    }
    const found = await query.where(
      and(
        inArray(
          primary.column,
          roots.map((root) => root[primary.key]),
        ),
        options.where && this.translateWhere(options.where, aliases),
      ),
    );

    const pairOf = (root: unknown, related: unknown) => keyOf([root, related]);
    const kept = new Set(
      found
        .filter(({ related }) => related != null)
        .map(({ root, related }) => pairOf(root, related)),
    );
    return (root, row) => kept.has(pairOf(root[primary.key], row[targetKey]));
  }

  /** The related rows of a relation this table or the target holds keys for. */
  private async readDirect(
    client: DrizzleClient,
    roots: PlainLiteralObject[],
    relation: DrizzleRelation,
    withDeleted: boolean | undefined,
  ): Promise<Map<PlainLiteralObject, PlainLiteralObject[]>> {
    const { pairs, target } = relation;
    const tupleOf = (row: PlainLiteralObject, side: 'from' | 'to') =>
      pairs.map((pair) => row[pair[side]]);

    const tuples = roots
      .map((root) => tupleOf(root, 'from'))
      .filter((values) => values.every((value) => value != null));

    const result = new Map<PlainLiteralObject, PlainLiteralObject[]>();
    if (tuples.length === 0) return result;

    const [single] = pairs;
    const match =
      pairs.length === 1 && single
        ? inArray(
            columnOf(target, single.to),
            tuples.map(([value]) => value),
          )
        : or(
            ...tuples.map((values) =>
              and(
                ...pairs.map((pair, index) =>
                  eq(columnOf(target, pair.to), values[index]),
                ),
              ),
            ),
          );

    const rows = toRows(
      await client
        .select()
        .from(pgTableOf(target))
        .where(
          and(match, this.live(target, relation.targetRemoveDate, withDeleted)),
        ),
    );

    const byKey = new Map<string, PlainLiteralObject[]>();
    for (const row of rows) {
      const key = keyOf(tupleOf(row, 'to'));
      byKey.set(key, [...(byKey.get(key) ?? []), row]);
    }
    for (const root of roots) {
      result.set(root, byKey.get(keyOf(tupleOf(root, 'from'))) ?? []);
    }
    return result;
  }

  /** The related rows of a many-to-many relation, through its junction. */
  private async readThrough(
    client: DrizzleClient,
    roots: PlainLiteralObject[],
    relation: DrizzleRelation,
    withDeleted: boolean | undefined,
  ): Promise<Map<PlainLiteralObject, PlainLiteralObject[]>> {
    const result = new Map<PlainLiteralObject, PlainLiteralObject[]>();
    const [on] = relation.pairs;
    const through = relation.through;
    if (!on || !through) return result;

    const values = roots
      .map((root) => root[on.from])
      .filter((value) => value != null);
    if (values.length === 0) return result;

    const junction = pgTableOf(through.table);
    const target = pgTableOf(relation.target);
    const link = pgColumnOf(junction, through.fromKey);
    const rows = await client
      .select({ link, row: getColumns(target) })
      .from(junction)
      .innerJoin(
        target,
        and(
          eq(columnOf(target, on.to), columnOf(junction, through.toKey)),
          this.live(target, relation.targetRemoveDate, withDeleted),
        ) ?? sql`1 = 1`,
      )
      .where(inArray(link, values));

    for (const root of roots) {
      result.set(
        root,
        toRows(
          rows
            .filter((found) => found.link === root[on.from])
            .map((found) => found.row),
        ),
      );
    }
    return result;
  }

  private async read(
    options: RepositoryFindOptions<Entity>,
    withPage: boolean,
  ): Promise<Entity[]> {
    const client = await this.client(options.ctx);
    const roots = await this.selectRoots(client, options, withPage);
    const joined = await this.attachJoined(client, roots, options);
    return roots.map((root) =>
      this.toResult(root, joined.get(root) ?? {}, options),
    );
  }

  protected async doFind(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<Entity[]> {
    return this.read(options, true);
  }

  protected async doFindOne(
    options: RepositoryFindOneOptions<Entity>,
  ): Promise<Entity | null> {
    const [row] = await this.read({ ...options, take: 1 }, true);
    return row ?? null;
  }

  protected async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    const client = await this.client(options.ctx);
    const names = this.namedRelations(options.where, undefined);
    const { joins, aliases } = this.filterJoins(names, options.withDeleted);
    const where = and(
      this.live(this.table, this.getDeleteDateColumn(), options.withDeleted),
      options.where && this.translateWhere(options.where, aliases),
    );

    if (joins.length === 0) {
      const [counted] = await client
        .select({ total: count() })
        .from(this.table)
        .where(where);
      return Number(counted?.total ?? 0);
    }

    const primary = this.primaryColumn('count with a joined filter');
    let query = client
      .select({ total: countDistinct(primary.column) })
      .from(this.table)
      .$dynamic();
    for (const join of joins) {
      query = query.leftJoin(pgTableOf(join.table), join.on);
    }
    const [counted] = await query.where(where);
    return Number(counted?.total ?? 0);
  }

  protected async doFindAndCount(
    options: RepositoryFindOptions<Entity> = {},
  ): Promise<[Entity[], number]> {
    const rows = await this.read(options, true);
    const total = await this.doCount({
      where: options.where,
      join: options.join,
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

  /** The values to set on a stored row: its version moves on. */
  private toSet(data: PlainLiteralObject): PlainLiteralObject {
    const values: PlainLiteralObject = { ...data };
    const version = this.getVersionColumn();
    if (version !== undefined) {
      values[version] = sql`${this.column(version)} + 1`;
    }
    return values;
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
   * One `UPDATE` of the row `entity`'s primary key names, at the guarded
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
    const client = await this.client(options?.ctx);
    const primary = this.primaryColumn(operation);
    const guard = options?.versionGuard;
    const where = and(
      eq(primary.column, entity[primary.key]),
      guard && eq(this.column(guard.column), guard.value),
    );

    const rows = toRows(
      Object.keys(data).length === 0 && !guard
        ? await client.select().from(this.table).where(where)
        : await client
            .update(this.table)
            .set(this.toSet(data))
            .where(where)
            .returning(),
    );

    const [row] = rows;
    if (row) return this.toEntity(row);

    if (guard) throw new OptimisticLockException(this.metadata.name);
    throw new EntityNotFoundException(this.metadata.name, operation);
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
   * Inserts, or updates the row the payload's primary key names, in one
   * statement.
   */
  protected async doUpsert(
    entity: DeepPartial<Entity>,
    options?: RepositoryUpsertOptions,
  ): Promise<Entity> {
    const client = await this.client(options?.ctx);
    const primary = this.primaryColumn('upsert');
    const data = this.withoutVersion(entity);
    const { [primary.key]: _key, ...changes } = data;
    // A payload of only its key still updates, so the row is returned.
    const set = this.toSet(
      Object.keys(changes).length > 0
        ? changes
        : {
            [primary.key]: sql`excluded.${sql.identifier(primary.column.name)}`,
          },
    );

    const [row] = toRows(
      await client
        .insert(this.table)
        .values(this.toInsert(data))
        .onConflictDoUpdate({ target: primary.column, set })
        .returning(),
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

  /**
   * `row` holding only what the read asked for: the columns it selected, or
   * all own columns, and each joined relation.
   */
  private toResult(
    row: PlainLiteralObject,
    joined: PlainLiteralObject,
    options: RepositoryFindOneOptions<Entity>,
  ): Entity {
    const keys = options.select?.length
      ? options.select.map(String)
      : this.metadata.columns.map((column) => column.name);
    const result: Entity = Object.create(this.metadata.type.prototype);
    const values: PlainLiteralObject = result;
    for (const key of keys) values[key] = row[key];

    for (const [name, value] of Object.entries(joined)) {
      const type = this.options.relationTypes.get(name);
      values[name] = Array.isArray(value)
        ? value.map((related) => this.instance(type, related))
        : value === null
          ? null
          : this.instance(type, value);
    }
    return result;
  }

  private instance(type: Type | undefined, values: unknown): unknown {
    if (typeof values !== 'object' || values === null) return values;
    const instance: PlainLiteralObject = Object.create(
      type?.prototype ?? Object.prototype,
    );
    return Object.assign(instance, values);
  }

  /** `values` as an instance of the entity class, holding nothing else. */
  private toEntity(values: PlainLiteralObject | DeepPartial<Entity>): Entity {
    const entity: Entity = Object.create(this.metadata.type.prototype);
    return Object.assign(entity, values);
  }
}

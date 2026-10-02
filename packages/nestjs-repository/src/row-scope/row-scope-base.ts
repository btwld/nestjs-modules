import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';
import { type WhereClause } from '../repository/interfaces/where-clause.interface.js';
import { type EntityColumn } from '../repository/repository.types.js';
import { Where } from '../repository/where.helpers.js';

import { RowScopeBootException } from './exceptions/row-scope-boot.exception.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from './interfaces/row-scope.interface.js';
import {
  isScalarValue,
  RowScopeOperation,
  type RowScopeValues,
  type ScalarValue,
} from './row-scope.types.js';

/**
 * The slice of a repository {@link RowScopeBase} needs.
 *
 * `findOne` for the pre-check, `metadata` to discover the primary key columns,
 * and `transform` to materialize a value the way the driver will. All public
 * repository methods — row scope is not a repository function, so the adapter
 * interface does not grow to serve it.
 */
export type RowScopeBaseRepository<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> = Pick<RepositoryInterface<Entity>, 'findOne' | 'metadata'> & {
  /**
   * Materialize an entity-like value the way the driver will.
   *
   * Declared over `PlainLiteralObject` rather than `DeepPartial<Entity>`
   * because a scope callback is handed the operation's real input, which is
   * typed that way. Only columns are read off the result, so the narrower
   * return type is not needed either.
   */
  transform(entityLike: PlainLiteralObject): PlainLiteralObject;
};

/**
 * Configuration for {@link RowScopeBase}.
 */
export interface RowScopeBaseOptions<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * Property read off the `RowScopeCtx` values to get the caller's scope value.
   * Configures the default `resolveScope`; omit only when overriding it.
   */
  readonly scopeKey?: string;

  /**
   * The column carrying the scope value, e.g. a tenant ID column. Configures
   * the default `resolveScope`; omit only when overriding it.
   */
  readonly column?: EntityColumn<Entity>;

  /** Entity name used in refusal messages. Defaults to `Row`. */
  readonly label?: string;
}

/**
 * A ready-to-extend row scope for scope expressed as columns on the entity.
 *
 * Four rules, and nothing else:
 *
 * 1. Reads inject the scope columns into the `WHERE`.
 * 2. Writes naming an existing row pre-check with the primary key **and** the
 *    scope columns in the `WHERE`.
 * 3. `create` is new data — the scope columns are stamped onto it. So is an
 *    `upsert` whose key names no stored row; one whose key names a row falls
 *    under rule 2.
 * 4. The scope columns take precedence over any same-named value in the
 *    payload, and a mismatch is refused — by whichever route the value arrives.
 *
 * It assumes every scoped entity carries its own scope column, so scope is
 * decided per row without following a relation.
 *
 * Three extension points, all ordinary overrides:
 *
 * - `resolveScope` for composite scope, or any mapping from the request's scope
 *   to columns other than the configured one.
 * - `scopeQuery` for a principal that reads more broadly than it writes — an
 *   internal dashboard reading every tenant returns `params.options` unchanged.
 *   That cannot widen a write: the pre-check carries the scope columns in its
 *   own `WHERE`.
 * - `scopeWrite` for a check this class cannot make, such as a foreign key that
 *   must point inside the caller's scope. Call `super.scopeWrite(params)` first.
 *
 * Name the entity in both type parameters rather than leaving them to default:
 * `column` is then checked against the entity's own columns, so a misspelled
 * scope column is a compile error rather than a boot failure.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrdersRowScope extends RowScopeBase<Order, TenantScope> {
 *   constructor(
 *     @InjectDynamicRepository(ORDER_TOKEN)
 *     orders: RepositoryInterface<Order>,
 *   ) {
 *     super(orders, { scopeKey: 'tenantId', column: 'tenantId', label: 'Order' });
 *   }
 * }
 * ```
 */
export abstract class RowScopeBase<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Scope extends PlainLiteralObject = PlainLiteralObject,
> implements RowScopeInterface<Scope> {
  private readonly primaryColumns: EntityColumn<Entity>[];
  private readonly label: string;

  constructor(
    private readonly repo: RowScopeBaseRepository<Entity>,
    private readonly options: RowScopeBaseOptions<Entity>,
  ) {
    this.label = options.label ?? 'Row';

    // Read from the entity rather than configured: the entity already declares
    // its keys, and a configured column that did not match would make every key
    // check inspect the wrong property.
    this.primaryColumns = repo.metadata.columns
      .filter((column) => column.isPrimary)
      .map((column) => column.name);

    // With no primary key nothing can be identified, so the pre-check would
    // reduce to the scope columns alone — matching any row in scope rather than
    // the one named. Fail at boot rather than serve that.
    if (this.primaryColumns.length === 0) {
      throw new RowScopeBootException([
        `${repo.metadata.name} has no primary key column, so ${this.constructor.name} cannot identify a row`,
      ]);
    }

    // A column that does not exist would silently scope nothing: the predicate
    // would filter on a column the driver has never heard of. Only checkable
    // for the configured path — a subclass overriding `resolveScope` produces
    // its columns per request, and supplies no configuration to check.
    const columns = new Set(repo.metadata.columns.map((column) => column.name));
    if (options.column !== undefined && !columns.has(options.column)) {
      throw new RowScopeBootException([
        `${this.constructor.name} declares scope column "${String(options.column)}", ` +
          `which is not a column on ${repo.metadata.name}`,
      ]);
    }
  }

  /**
   * The caller's scope, as the columns it is confined to and their values.
   *
   * Override for composite scope, or to map the request's scope onto different
   * columns. **Must be a pure, synchronous function of `scope`** — a write
   * calls it more than once, re-entrantly, because the pre-check passes back
   * through `scopeQuery`, and those calls must agree. A value
   * needing a lookup belongs on the `RowScopeCtx` overlay, attached by an
   * interceptor before the request reaches a repository.
   *
   * Returning no columns means "no scope at all" and is treated as a
   * misconfiguration: such a principal reads nothing and writes nothing.
   */
  protected resolveScope(scope: Scope | undefined): RowScopeValues<Entity> {
    const { scopeKey, column } = this.options;

    // Unreachable for a configured subclass; guards one that overrides neither
    // `resolveScope` nor supplies the configuration it reads.
    if (scopeKey === undefined || column === undefined) {
      throw new RuntimeException({
        message:
          'No scopeKey/column configured for the default row scope resolver',
        fault: 'usage',
      });
    }

    const value = scope?.[scopeKey];

    if (!isScalarValue(value)) {
      this.refuse(
        HttpStatus.FORBIDDEN,
        'No scope value on the request context',
      );
    }

    // Assigned rather than returned as a computed-key literal, whose key type
    // widens to `string` and would need a cast to narrow back.
    const values: Partial<Record<EntityColumn<Entity>, ScalarValue>> = {};
    values[column] = value;

    return values;
  }

  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, Scope>,
  ): Options {
    const predicates = this.predicatesOf(this.resolveScope(params.scope));

    const scoped =
      predicates.length === 1 ? predicates[0] : Where.and(...predicates);

    return {
      ...params.options,
      where: params.options.where
        ? Where.and(params.options.where, scoped)
        : scoped,
    };
  }

  async scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, Scope>,
  ): Promise<Value> {
    const values = this.resolveScope(params.scope);

    switch (params.operation) {
      case RowScopeOperation.DELETE:
      case RowScopeOperation.DELETE_MANY:
      case RowScopeOperation.SOFT_DELETE:
      case RowScopeOperation.RESTORE:
        // `value`, not `target`: `value` is what the driver acts on.
        await this.precheck(this.resolveKey(params.value), values, params.ctx);
        return params.value;

      case RowScopeOperation.UPDATE:
      case RowScopeOperation.REPLACE:
        await this.precheck(this.resolveKey(params.target), values, params.ctx);
        return this.stampOrRefuse(params.value, values);

      case RowScopeOperation.UPSERT: {
        // An absent or partial key is refused rather than assumed to be an
        // insert: it cannot be looked up, and a column the caller omitted may
        // be filled by a database default and still land on an existing row.
        const key = this.resolveKey(params.value);

        if (key === undefined) {
          this.refuse(
            HttpStatus.BAD_REQUEST,
            `Upsert requires a complete ${this.label.toLowerCase()} key`,
          );
        }

        // `target` answers whether the key names a row at all — a question
        // this class cannot ask, because its own reads carry the scope
        // predicate and so cannot tell "no such row" from "not yours". No
        // target means the conflict clause has nothing to fire on, so the
        // write inserts and only needs stamping.
        if (params.target !== undefined) {
          await this.precheck(key, values, params.ctx);
        }

        return this.stampOrRefuse(params.value, values);
      }

      case RowScopeOperation.CREATE:
      case RowScopeOperation.CREATE_MANY:
        // No pre-check: a create names no existing row, and the adapter already
        // refuses one whose key is taken, whatever scope owns it.
        return this.stampOrRefuse(params.value, values);

      default:
        // Only reachable if a new operation is added without a case here, so
        // this is a framework defect rather than anything the caller did. It
        // still fails closed: an unrecognized write is refused, not passed on.
        throw new RuntimeException({
          message: 'Unhandled row scope write operation "%s"',
          messageParams: [params.operation],
          fault: 'usage',
        });
    }
  }

  /**
   * Refuse the operation. The refusal path for this class.
   */
  protected refuse(httpStatus: HttpStatus, message: string): never {
    throw new RuntimeException({ message, httpStatus, fault: 'client' });
  }

  /**
   * Rule 1. One `eq` per scope column.
   *
   * No columns is a misconfiguration, not a superuser: `return {}` is the
   * natural way to write "this principal has no scope", and it must read
   * nothing rather than everything.
   */
  private predicatesOf(values: RowScopeValues<Entity>): WhereClause[] {
    const columns = Object.keys(values);

    if (columns.length === 0) {
      return [Where.never()];
    }

    return columns.map((column) => Where.eq(column, values[column]));
  }

  /**
   * The primary key `source` names, or `undefined` if any column is missing.
   *
   * Read off `transform`, never the raw payload: a driver prefers a relation
   * object over the column's own scalar, so `{ account: { id } }` is a key.
   */
  private resolveKey(
    source: PlainLiteralObject | undefined,
  ): PlainLiteralObject | undefined {
    if (!source) return undefined;

    const materialized = this.repo.transform(source);
    const key: PlainLiteralObject = {};

    for (const column of this.primaryColumns) {
      const value = materialized[column];

      if (value === undefined) return undefined;

      if (!isScalarValue(value)) {
        // Malformed input rather than a denial: 400 keeps it distinct from the
        // 404 that deliberately does not reveal whether a row exists.
        this.refuse(
          HttpStatus.BAD_REQUEST,
          `Unusable ${this.label.toLowerCase()} key`,
        );
      }

      key[column] = value;
    }

    return key;
  }

  /**
   * Rule 2. One query: the primary key **and** the scope columns.
   *
   * This query's own `WHERE` decides, so a miss is always a 404 — including a
   * row the caller can read through a widened `scopeQuery` but may not write.
   *
   * Check-then-write: the write identifies its row by primary key alone, so
   * this read has to be authoritative. See "Natural keys need a serializable
   * transaction" in the README.
   *
   * `withDeleted` because this answers "is this row mine?", not "is it
   * deleted?" — a restore's target is soft-deleted by definition.
   */
  private async precheck(
    key: PlainLiteralObject | undefined,
    values: RowScopeValues<Entity>,
    ctx: PlainLiteralObject | undefined,
  ): Promise<void> {
    if (key === undefined) {
      this.refuse(HttpStatus.NOT_FOUND, `${this.label} not found`);
    }

    const conditions = [
      ...this.primaryColumns.map((column) => Where.eq(column, key[column])),
      ...this.predicatesOf(values),
    ];

    const found = await this.repo.findOne({
      where: conditions.length === 1 ? conditions[0] : Where.and(...conditions),
      withDeleted: true,
      ctx,
    });

    if (!found) {
      this.refuse(HttpStatus.NOT_FOUND, `${this.label} not found`);
    }

    // The query above goes through the public `findOne`, so a hook or a
    // `scopeQuery` override sits between this and the driver. Comparing the row
    // that came back closes a substituted result, a rewritten `where`, and an
    // override that drops the predicate.
    for (const column of Object.keys(values)) {
      if (found[column] !== values[column]) {
        this.refuse(HttpStatus.NOT_FOUND, `${this.label} not found`);
      }
    }
  }

  /**
   * Rules 3 and 4. Stamp the scope columns; refuse a value scoped elsewhere.
   *
   * Reads the incoming value off `transform` so a scope column arriving through
   * a relation object is seen, and returns a copy rather than stamping the
   * caller's object. The copy is shallow — a nested relation object is shared,
   * which is fine for plain data and no defence against an accessor, and
   * supplying one of those means running code in the process.
   */
  private stampOrRefuse<Value extends PlainLiteralObject>(
    value: Value,
    values: RowScopeValues<Entity>,
  ): Value {
    if (Object.keys(values).length === 0) {
      this.refuse(HttpStatus.FORBIDDEN, 'Not permitted to write in this scope');
    }

    const materialized = this.repo.transform(value);

    for (const [column, scopeValue] of Object.entries(values)) {
      const current = materialized[column];

      if (current !== undefined && current !== scopeValue) {
        // Deliberately does not name the column — that leaks scope structure.
        this.refuse(
          HttpStatus.FORBIDDEN,
          `Refusing to write a ${this.label.toLowerCase()} scoped elsewhere`,
        );
      }
    }

    return Object.assign({ ...value }, values);
  }
}

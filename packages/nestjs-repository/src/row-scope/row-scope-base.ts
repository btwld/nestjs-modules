import { HttpStatus, type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { type WhereClause } from '../repository/interfaces/where-clause.interface.js';
import { Where } from '../repository/where.helpers.js';

import {
  type RowScopeColumn,
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from './interfaces/row-scope.interface.js';
import {
  enforcedScopeColumns,
  isScalarValue,
  RowScopeOperation,
  type RowScopeValues,
  type ScalarValue,
} from './row-scope.types.js';

/**
 * Configuration for {@link RowScopeBase}.
 */
export interface RowScopeBaseOptions<
  Scope extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * The columns carrying the caller's scope, e.g. a tenant ID column, on every
   * entity the resolver serves. A name reads the caller's value from the
   * `RowScopeCtx` key of the same name; `{ column, key }` names the key.
   */
  readonly scope: readonly (string | RowScopeColumn)[];

  /**
   * The scope columns a caller is not held to on reads — every column for a
   * caller who reads everything. Writes are never relaxed: a caller writes
   * only inside its full scope. Not called without a scope.
   *
   * Must be a pure function of `scope`: it is asked again when a read joins.
   */
  readonly relax?: (scope: Scope) => readonly string[];

  /**
   * Let reads join between entities scoped by joinable resolvers on the same
   * columns. See {@link RowScopeInterface.joinable} for what this states —
   * leave it off a subclass whose `scopeQuery` reads more broadly or more
   * narrowly than its enforced columns, for any caller.
   */
  readonly joinable?: boolean;
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
 *    payload, and a mismatch is refused.
 *
 * It assumes every scoped entity carries its own scope columns, so scope is
 * decided per row without following a relation. One resolver serves every
 * entity registered with it in `forRoot()`; each must have a primary key and
 * the scope columns, checked at startup.
 *
 * A caller that reads more broadly than it writes — an administrator reading
 * every tenant — is the `relax` option: rule 1 then enforces only the columns
 * it leaves, and rules 2 to 4 still hold the caller to every scope column.
 *
 * Two extension points, both ordinary overrides:
 *
 * - `scopeQuery` for a read `relax` cannot express. Such a resolver is not
 *   `joinable`.
 * - `scopeWrite` for a check this class cannot make, such as a foreign key that
 *   must point inside the caller's scope. Call `super.scopeWrite(params)` first.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TenantRowScope extends RowScopeBase<TenantScope> {
 *   constructor() {
 *     super({ scope: ['tenantId'], joinable: true });
 *   }
 * }
 * ```
 */
export abstract class RowScopeBase<
  Scope extends PlainLiteralObject = PlainLiteralObject,
> implements RowScopeInterface<Scope> {
  readonly scopeColumns: readonly RowScopeColumn[];
  readonly joinable: boolean;
  private readonly relax?: (scope: Scope) => readonly string[];

  constructor(options: RowScopeBaseOptions<Scope>) {
    this.scopeColumns = options.scope.map((entry) =>
      typeof entry === 'string' ? { column: entry, key: entry } : entry,
    );
    this.joinable = options.joinable === true;
    this.relax = options.relax;
  }

  relaxedColumns(scope: Scope | undefined): readonly string[] {
    return scope === undefined || !this.relax ? [] : this.relax(scope);
  }

  /**
   * The caller's values for `columns`.
   *
   * A pure function of `scope`: a write calls it more than once, re-entrantly,
   * because the pre-check passes back through `scopeQuery`. A value needing a
   * lookup belongs on the `RowScopeCtx` overlay, attached by an interceptor
   * before the request reaches a repository.
   *
   * No scope columns at all is a misconfiguration, not a superuser: such a
   * resolver reads nothing and writes nothing.
   */
  private resolveScope(
    scope: Scope | undefined,
    columns: readonly RowScopeColumn[],
  ): RowScopeValues {
    const values: Record<string, ScalarValue> = {};

    for (const { column, key } of columns) {
      const value: unknown = scope?.[key];

      if (!isScalarValue(value)) {
        this.refuse(
          HttpStatus.FORBIDDEN,
          'No scope value on the request context',
        );
      }

      values[column] = value;
    }

    return values;
  }

  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, Scope>,
  ): Options {
    const enforced = enforcedScopeColumns(this, params.scope);

    // Every column relaxed reads everything; no columns at all reads nothing.
    if (enforced.length === 0 && this.scopeColumns.length > 0) {
      return params.options;
    }

    const predicates = this.predicatesOf(
      this.resolveScope(params.scope, enforced),
    );

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
    const values = this.resolveScope(params.scope, this.scopeColumns);

    switch (params.operation) {
      case RowScopeOperation.DELETE:
      case RowScopeOperation.DELETE_MANY:
      case RowScopeOperation.SOFT_DELETE:
      case RowScopeOperation.RESTORE:
        // `value`, not `target`: `value` is what the driver acts on.
        await this.precheck(
          params,
          this.resolveKey(params, params.value),
          values,
        );
        return params.value;

      case RowScopeOperation.UPDATE:
      case RowScopeOperation.REPLACE:
        await this.precheck(
          params,
          this.resolveKey(params, params.target),
          values,
        );
        return this.stampOrRefuse(params, values);

      case RowScopeOperation.UPSERT: {
        // An absent or partial key is refused rather than assumed to be an
        // insert: it cannot be looked up, and a column the caller omitted may
        // be filled by a database default and still land on an existing row.
        const key = this.resolveKey(params, params.value);

        if (key === undefined) {
          this.refuse(
            HttpStatus.BAD_REQUEST,
            `Upsert requires a complete ${params.repository.metadata.name} key`,
          );
        }

        // No target means the key names no row, so the write inserts.
        if (params.target !== undefined) {
          await this.precheck(params, key, values);
        }

        return this.stampOrRefuse(params, values);
      }

      case RowScopeOperation.CREATE:
      case RowScopeOperation.CREATE_MANY:
        // No pre-check: a create names no existing row, and the adapter already
        // refuses one whose key is taken, whatever scope owns it.
        return this.stampOrRefuse(params, values);
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
   * No columns is a misconfiguration, not a superuser: it must read nothing
   * rather than everything.
   */
  private predicatesOf(values: RowScopeValues): WhereClause[] {
    const columns = Object.keys(values);

    if (columns.length === 0) {
      return [Where.never()];
    }

    return columns.map((column) => Where.eq(column, values[column]));
  }

  /**
   * The primary key `source` names, or `undefined` if any column is missing.
   *
   * The repository hands a resolver only the entity's own columns, so the key
   * is read off `source`. The repository refuses at startup to scope an
   * entity with no primary key.
   */
  private resolveKey(
    params: RowScopeWriteParams<PlainLiteralObject, Scope>,
    source: PlainLiteralObject | undefined,
  ): PlainLiteralObject | undefined {
    if (!source) return undefined;

    const key: PlainLiteralObject = {};

    for (const column of this.primaryColumnsOf(params)) {
      const value: unknown = source[column];

      if (value === undefined) return undefined;

      if (!isScalarValue(value)) {
        // Malformed input rather than a denial: 400 keeps it distinct from the
        // 404 that deliberately does not reveal whether a row exists.
        this.refuse(
          HttpStatus.BAD_REQUEST,
          `Unusable ${params.repository.metadata.name} key`,
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
   * row the caller can read through `relax` but may not write.
   *
   * Check-then-write: the write identifies its row by primary key alone, so
   * this read has to be authoritative. See "Natural keys need a serializable
   * transaction" in the README.
   *
   * `withDeleted` because this answers "is this row mine?", not "is it
   * deleted?" — a restore's target is soft-deleted by definition.
   */
  private async precheck(
    params: RowScopeWriteParams<PlainLiteralObject, Scope>,
    key: PlainLiteralObject | undefined,
    values: RowScopeValues,
  ): Promise<void> {
    const { repository, ctx } = params;
    const notFound = `${repository.metadata.name} not found`;

    if (key === undefined) {
      this.refuse(HttpStatus.NOT_FOUND, notFound);
    }

    const conditions = [
      ...this.primaryColumnsOf(params).map((column) =>
        Where.eq(column, key[column]),
      ),
      ...this.predicatesOf(values),
    ];

    const found = await repository.findOne({
      where: conditions.length === 1 ? conditions[0] : Where.and(...conditions),
      withDeleted: true,
      ctx,
    });

    if (!found) {
      this.refuse(HttpStatus.NOT_FOUND, notFound);
    }
  }

  /**
   * Rules 3 and 4. Stamp the scope columns; refuse a value scoped elsewhere.
   *
   * Returns a copy rather than stamping the caller's object.
   */
  private stampOrRefuse<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, Scope>,
    values: RowScopeValues,
  ): Value {
    const { value } = params;

    if (Object.keys(values).length === 0) {
      this.refuse(HttpStatus.FORBIDDEN, 'Not permitted to write in this scope');
    }

    for (const [column, scopeValue] of Object.entries(values)) {
      const current: unknown = value[column];

      if (current !== undefined && current !== scopeValue) {
        // Deliberately does not name the column — that leaks scope structure.
        this.refuse(
          HttpStatus.FORBIDDEN,
          `Refusing to write a ${params.repository.metadata.name} scoped elsewhere`,
        );
      }
    }

    return Object.assign({ ...value }, values);
  }

  private primaryColumnsOf(
    params: RowScopeWriteParams<PlainLiteralObject, Scope>,
  ): string[] {
    return params.repository.metadata.columns
      .filter((column) => column.isPrimary)
      .map((column) => column.name);
  }
}

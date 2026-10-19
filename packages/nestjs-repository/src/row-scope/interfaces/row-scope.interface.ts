import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';
import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import {
  type RowScopeQueryOperation,
  type RowScopeWriteOperation,
} from '../row-scope.types.js';

/**
 * A scope column, and the `RowScopeCtx` key the caller's value for it is read
 * from.
 */
export interface RowScopeColumn {
  readonly column: string;
  readonly key: string;
}

/**
 * The repository a write is scoped for, as a resolver sees it: its public
 * `findOne`, its name and its columns.
 */
export interface RowScopeRepository extends Pick<
  RepositoryInterface<PlainLiteralObject>,
  'findOne'
> {
  readonly metadata: {
    readonly name: string;
    readonly columns: readonly {
      readonly name: string;
      readonly isPrimary: boolean;
    }[];
  };
}

/**
 * Input handed to `scopeQuery` for a read operation.
 */
export interface RowScopeQueryParams<
  Options extends { where?: WhereClause } = { where?: WhereClause },
  Scope extends PlainLiteralObject = PlainLiteralObject,
> {
  readonly operation: RowScopeQueryOperation;
  readonly options: Options;

  /**
   * The context the driver will run this operation under.
   *
   * Plumbing, not authority — pass it through on reads the resolver makes
   * itself. Decide *who the caller is* from `scope`. See
   * {@link RowScopeInterface}.
   */
  readonly ctx: PlainLiteralObject | undefined;

  /**
   * The `RowScopeCtx` overlay, resolved before hooks ran — a fresh copy of
   * the overlay's values, so mutating it affects nothing.
   *
   * `undefined` when no scope was attached, which a resolver should treat as
   * "cannot establish the principal" and refuse.
   */
  readonly scope: Scope | undefined;
}

/**
 * Input handed to `scopeWrite` for a write operation.
 *
 * `target` is the existing row the call is aimed at, or `undefined` when it
 * names none (`create`, `createMany`, an `upsert` whose key matches no row);
 * `value` is what will be written. `createMany` and `deleteMany` call this once
 * per element. See "What a resolver has to check" in the README.
 */
export interface RowScopeWriteParams<
  Value extends PlainLiteralObject = PlainLiteralObject,
  Scope extends PlainLiteralObject = PlainLiteralObject,
> {
  readonly operation: RowScopeWriteOperation;
  readonly value: Value;
  readonly target: PlainLiteralObject | undefined;

  /**
   * The repository being written, for a pre-check read through its public
   * `findOne` and for its metadata. One resolver may serve many entities, so
   * this is how it knows which one.
   */
  readonly repository: RowScopeRepository;

  /**
   * The context the driver will run this operation under. See
   * {@link RowScopeQueryParams.ctx}.
   */
  readonly ctx: PlainLiteralObject | undefined;

  /**
   * The `RowScopeCtx` overlay, resolved before hooks ran — a fresh copy of
   * the overlay's values, so mutating it affects nothing. See
   * {@link RowScopeQueryParams.scope}.
   */
  readonly scope: Scope | undefined;
}

/**
 * The row scope callback contract.
 *
 * An implementation owns *all* enforcement: the read predicate, stamping,
 * refusing, and any visibility read it needs to decide. The framework owns
 * exactly one guarantee — that these methods are invoked at every repository
 * entry point, with that operation's real input, before the driver sees it.
 * It never inspects, verifies, or second-guesses what they return.
 *
 * A refusal must be a `RuntimeException` (or subclass). Repositories are not
 * part of the transport layer, so which HTTP status a refusal deserves is a
 * hint (`httpStatus`), not a commitment this layer makes.
 *
 * **`params.scope` decides who the caller is; `params.ctx` is plumbing.**
 * Never read scope from `ctx` — a hook can replace it. Pass `ctx` through
 * unchanged on any read the resolver makes, so that read joins the caller's
 * transaction. See "`scope` versus `ctx`" in the README.
 *
 * The `Scope` type parameter is a convenience for reading the overlay, not a
 * runtime guarantee — validate what you read.
 *
 * One resolver may serve any number of entities: register the same class for
 * each in `forRoot()`. Reads join between entities only when both resolvers
 * are `joinable` on the same columns.
 *
 * When scope is equality on entity columns, extend `RowScopeBase` rather than
 * implementing this directly. See the Row Scope section of the README for
 * both, and for where scope comes from.
 */
export interface RowScopeInterface<
  Scope extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * The columns every entity this resolver serves is confined by, each with
   * the `RowScopeCtx` key its value is read from. Each must be a column of
   * every entity the resolver is registered for, checked at startup.
   */
  readonly scopeColumns?: readonly RowScopeColumn[];

  /**
   * States that every row `scopeQuery` lets any caller read is confined by
   * exactly equality on `scopeColumns`, to the values under their keys — no
   * row admitted more broadly, none held back more narrowly.
   *
   * That lets a read join a relation into rows another joinable resolver
   * scopes, when each of that resolver's scope columns is also one of this
   * resolver's, read from the same key, and the join matches it to itself: the
   * joined rows then carry the values the other resolver would require.
   * Leave unset and no read joins between this resolver's rows and any other
   * scoped rows.
   */
  readonly joinable?: boolean;

  /**
   * Return the options the driver should run, scoped to the caller.
   *
   * Whatever is returned is handed to the driver untouched.
   */
  scopeQuery<Options extends { where?: WhereClause }>(
    params: RowScopeQueryParams<Options, Scope>,
  ): Options | Promise<Options>;

  /**
   * Return the value the driver should write, or throw to refuse the call.
   *
   * A value carrying a foreign scope must be refused, not silently rewritten
   * to the caller's own scope.
   */
  scopeWrite<Value extends PlainLiteralObject>(
    params: RowScopeWriteParams<Value, Scope>,
  ): Value | Promise<Value>;
}

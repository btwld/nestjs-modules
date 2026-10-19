import { type PlainLiteralObject } from '@nestjs/common';

import { type WhereClause } from '../../repository/interfaces/where-clause.interface.js';
import {
  type RowScopeQueryOperation,
  type RowScopeWriteOperation,
} from '../row-scope.types.js';

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
 * When scope is equality on entity columns, extend `RowScopeBase` rather than
 * implementing this directly. See the Row Scope section of the README for
 * both, and for where scope comes from.
 */
export interface RowScopeInterface<
  Scope extends PlainLiteralObject = PlainLiteralObject,
> {
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

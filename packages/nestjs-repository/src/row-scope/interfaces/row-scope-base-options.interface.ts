import { type PlainLiteralObject } from '@nestjs/common';

import { type RowScopeColumn } from './row-scope.interface.js';

/**
 * Configuration for `RowScopeBase`.
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
   * columns. See `RowScopeInterface.joinable` for what this states —
   * leave it off a subclass whose `scopeQuery` reads more broadly or more
   * narrowly than its enforced columns, for any caller.
   */
  readonly joinable?: boolean;
}

import { type PlainLiteralObject } from '@nestjs/common';

/**
 * The options objects of calls the repository makes itself, which no
 * authority decides, each with the one repository it was made for: an
 * activity record of a write that was already decided, the read a row scope
 * makes to check that a row is the caller's, and a cascade's reads of the
 * related rows it writes.
 *
 * Module-private and never exported, so only this package can mark a call.
 * A mark covers only the options object it was made with, and only on the
 * repository it names: hooks are handed the options object, so one passing
 * it on to another repository is decided there as its caller. Anything else
 * reaching a governed repository, cascade writes included, is decided as its
 * caller.
 */
const INTERNAL_CALLS = new WeakMap<object, object>();

/**
 * `options`, marked as a call the repository makes itself to `repository`.
 */
export function internalCall<Options extends PlainLiteralObject>(
  options: Options,
  repository: object,
): Options {
  INTERNAL_CALLS.set(options, repository);
  return options;
}

/**
 * Whether `options` was marked by `internalCall` for `repository`.
 */
export function isInternalCall(
  options: object | undefined,
  repository: object,
): boolean {
  return options !== undefined && INTERNAL_CALLS.get(options) === repository;
}

/**
 * The options objects of a cascade's writes to related rows, each with the
 * repository it was made for and the foreign key the cascade sets to link
 * the row to its parent. The write is decided as its caller; only that
 * column, whose value the repository sets to the parent's key, is not
 * counted against the actor. Module-private, like `INTERNAL_CALLS`.
 */
const LINKED_COLUMNS = new WeakMap<
  object,
  { repository: object; columns: readonly string[] }
>();

/**
 * `options`, marked as a cascade's write to `repository` linking a related
 * row by `columns`.
 */
export function linkedCall<Options extends PlainLiteralObject>(
  options: Options,
  repository: object,
  columns: readonly string[],
): Options {
  LINKED_COLUMNS.set(options, { repository, columns });
  return options;
}

/**
 * The columns `options` was marked by `linkedCall` as linking by on
 * `repository`, if any.
 */
export function linkedColumns(
  options: object | undefined,
  repository: object,
): readonly string[] {
  const linked = options && LINKED_COLUMNS.get(options);
  return linked?.repository === repository ? linked.columns : [];
}

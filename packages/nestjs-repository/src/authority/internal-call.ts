import { type PlainLiteralObject } from '@nestjs/common';

/**
 * The options objects of calls the repository makes itself, which no
 * authority decides: an activity record of a write that was already decided,
 * and the read a row scope makes to check that a row is the caller's.
 *
 * Module-private and never exported, so only this package can mark a call,
 * and a mark covers only the options object it was made with. Anything else
 * reaching a governed repository, cascade writes and hooks included, is
 * decided as its caller.
 */
const INTERNAL_CALLS = new WeakSet<object>();

/**
 * `options`, marked as a call the repository makes itself.
 */
export function internalCall<Options extends PlainLiteralObject>(
  options: Options,
): Options {
  INTERNAL_CALLS.add(options);
  return options;
}

/**
 * Whether `options` was marked by `internalCall`.
 */
export function isInternalCall(options: object | undefined): boolean {
  return options !== undefined && INTERNAL_CALLS.has(options);
}

/**
 * The options objects of a cascade's writes to related rows, each with the
 * foreign key the cascade sets to link the row to its parent. The write is
 * decided as its caller; only that column, whose value the repository sets
 * to the parent's key, is not counted against the actor. Module-private,
 * like `INTERNAL_CALLS`.
 */
const LINKED_COLUMNS = new WeakMap<object, readonly string[]>();

/**
 * `options`, marked as a cascade's write linking a related row by `columns`.
 */
export function linkedCall<Options extends PlainLiteralObject>(
  options: Options,
  columns: readonly string[],
): Options {
  LINKED_COLUMNS.set(options, columns);
  return options;
}

/**
 * The columns `options` was marked by `linkedCall` as linking by, if any.
 */
export function linkedColumns(options: object | undefined): readonly string[] {
  return (options && LINKED_COLUMNS.get(options)) ?? [];
}

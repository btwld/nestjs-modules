import { type Actor } from '@concepta/nestjs-core';

/**
 * What an entity's authority allowed one call. A column set that is absent
 * means every column.
 */
export interface AuthorizedCallInterface {
  /** Who the call was decided for. */
  readonly actor: Actor;

  /**
   * Each action the call takes, with the columns it may touch: its own, and
   * the domain operation a write names.
   */
  readonly actions: ReadonlyMap<string, ReadonlySet<string> | undefined>;

  /**
   * The columns the call's results may hold. A write's result also always
   * holds its primary key.
   */
  readonly readable: ReadonlySet<string> | undefined;

  /**
   * For each action decided, `read` included, the gate of each column left
   * out because a decision is still pending.
   */
  readonly gates: ReadonlyMap<
    string,
    Readonly<Partial<Record<string, string>>>
  >;

  /**
   * Columns a write sets that are not counted against the actor: the foreign
   * key a cascade links a related row to its parent by.
   */
  readonly linked: ReadonlySet<string>;
}

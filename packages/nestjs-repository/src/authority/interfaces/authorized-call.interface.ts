import { type ActionEnum, type Actor } from '@concepta/nestjs-core';

/**
 * What an entity's authority allowed one call. A column set that is absent
 * means every column.
 */
export interface AuthorizedCallInterface {
  /** Who the call was decided for. */
  readonly actor: Actor;

  /** Each action the call takes, with the columns it may touch. */
  readonly actions: ReadonlyMap<ActionEnum, ReadonlySet<string> | undefined>;

  /**
   * The columns the call's results may hold. A write's result also always
   * holds its primary key.
   */
  readonly readable: ReadonlySet<string> | undefined;

  /**
   * Columns a write sets that are not counted against the actor: the foreign
   * key a cascade links a related row to its parent by.
   */
  readonly linked: ReadonlySet<string>;
}

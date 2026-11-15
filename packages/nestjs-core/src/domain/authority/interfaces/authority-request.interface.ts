import { type Actor } from './actor.type.js';

/**
 * What an authority is asked: may this actor take this action on this
 * subject?
 *
 * `Column` narrows the subject's column names, for an authority written for
 * one entity.
 */
export interface AuthorityRequestInterface<Column extends string = string> {
  actor: Actor;
  /**
   * The subject's name, as the implementer catalogued it.
   */
  subject: string;
  /**
   * An `ActionEnum` value from a repository; a route may ask for its own,
   * such as `approve`.
   */
  action: string;
  /**
   * Every column of the entity when a repository asks, so an answer can
   * allow all of them but some. Empty when access control's checks (route
   * checks, `can` and `assert`) ask about the action, and about `read` too
   * for any other action, since a write's response shows what a read would;
   * answer those by the action.
   */
  columns: readonly Column[];
}

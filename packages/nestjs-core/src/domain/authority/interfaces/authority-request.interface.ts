import { type Actor } from './actor.type.js';

/**
 * What an authority is asked: may this actor take this action on this object?
 *
 * `Column` narrows the object's column names, for an authority written for
 * one entity.
 */
export interface AuthorityRequestInterface<Column extends string = string> {
  actor: Actor;
  /**
   * The object's name, as the implementer catalogued it.
   */
  object: string;
  /**
   * An `ActionEnum` value from a repository; a route may ask for its own,
   * such as `approve`.
   */
  action: string;
  /**
   * Every column of the object, so an answer can allow all of them but some.
   */
  columns: readonly Column[];
}

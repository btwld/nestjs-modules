import { type Actor } from './actor.type.js';

/**
 * What an authority is asked: may this actor take this action on this object?
 */
export interface AuthorityRequestInterface {
  actor: Actor;
  /**
   * The object's name, as the implementer catalogued it.
   */
  object: string;
  /**
   * `create`, `read`, `update` or `delete` (`ActionEnum`) from a repository;
   * a route may ask for its own, such as `approve`.
   */
  action: string;
  /**
   * Every column of the object, so an answer can allow all of them but some.
   */
  columns: readonly string[];
}

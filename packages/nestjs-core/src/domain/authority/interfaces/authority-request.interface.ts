import { type ActionEnum } from '../../enums/action.enum.js';

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
  action: ActionEnum;
  /**
   * Every column of the object, so an answer can allow all of them but some.
   */
  columns: readonly string[];
}

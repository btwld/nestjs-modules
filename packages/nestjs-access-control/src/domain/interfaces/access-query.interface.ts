import { type PossessionEnum } from '../enums/possession.enum.js';

import { type AccessActor } from './access-actor.type.js';

/**
 * The grant a route was let through on: the action and resource it
 * declared, with the possession that allowed it.
 */
export interface AccessQueryInterface {
  actor: AccessActor;
  action: string;
  possession: PossessionEnum;
  resource: string;
}

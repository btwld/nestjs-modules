import { type Actor } from '@concepta/nestjs-core';

import { type PossessionEnum } from '../enums/possession.enum.js';

/**
 * The grant a route was let through on: the action and resource it
 * declared, with the possession that allowed it.
 */
export interface AccessQueryInterface {
  actor: Actor;
  action: string;
  possession: PossessionEnum;
  resource: string;
}

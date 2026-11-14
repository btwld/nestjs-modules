import { type Actor, type AuthorityRuleInterface } from '@concepta/nestjs-core';

import { type AccessAbility } from './access-ability.type.js';

/**
 * Who is acting for a call, their validated rules, and the ability built
 * from them.
 */
export interface AccessResolutionInterface {
  actor: Actor;
  rules: readonly AuthorityRuleInterface<string>[];
  ability: AccessAbility;
}

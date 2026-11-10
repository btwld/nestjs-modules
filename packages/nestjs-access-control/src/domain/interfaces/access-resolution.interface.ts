import { type AccessAbility } from './access-ability.type.js';
import { type AccessActor } from './access-actor.type.js';
import { type AccessRuleInterface } from './access-rule.interface.js';

/**
 * Who is acting for a call, their validated rules, and the ability built
 * from them.
 */
export interface AccessResolutionInterface {
  actor: AccessActor;
  rules: AccessRuleInterface[];
  ability: AccessAbility;
}

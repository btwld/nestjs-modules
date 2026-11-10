import { type AccessAbility } from './access-ability.type.js';
import { type AccessQueryInterface } from './access-query.interface.js';

/**
 * What a checked route decided: the grant it let the call through on, and
 * the caller's ability, for the checks that follow in the same call.
 */
export interface AccessDecisionInterface {
  query: AccessQueryInterface;
  ability: AccessAbility;
}

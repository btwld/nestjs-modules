import { type PlainLiteralObject } from '@nestjs/common';

import { type AccessActor } from './access-actor.type.js';
import { type AccessRuleInterface } from './access-rule.interface.js';

/**
 * Supplies an actor's rules for a call. Called on every check, so rules
 * edited at runtime apply to the next call; caching is the provider's.
 * Every rule set it returns is validated before use.
 */
export interface AccessGrantsProviderInterface {
  rulesFor(
    ctx: PlainLiteralObject,
    actor: AccessActor,
  ): Promise<AccessRuleInterface[]>;
}

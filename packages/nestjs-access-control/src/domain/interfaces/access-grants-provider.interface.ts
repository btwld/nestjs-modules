import { type PlainLiteralObject } from '@nestjs/common';

import { type Actor, type AuthorityRuleInterface } from '@concepta/nestjs-core';

/**
 * Supplies an actor's rules for a call. Called on every check, so rules
 * edited at runtime apply to the next call; caching is the provider's.
 * Every rule set it returns is validated before use.
 */
export interface AccessGrantsProviderInterface {
  rulesFor(
    ctx: PlainLiteralObject,
    actor: Actor,
  ):
    | readonly AuthorityRuleInterface<string>[]
    | Promise<readonly AuthorityRuleInterface<string>[]>;
}

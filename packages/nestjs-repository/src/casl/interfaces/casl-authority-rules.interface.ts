import { type PlainLiteralObject } from '@nestjs/common';

import { type Actor, type AuthorityRuleInterface } from '@concepta/nestjs-core';

/**
 * Where an application keeps its rules: in settings, a table, or another
 * service. Asked once per `ctx`, so every check in a call reads the same
 * rules.
 */
export interface CaslAuthorityRulesInterface {
  rulesFor(
    ctx: PlainLiteralObject,
    actor: Actor,
  ):
    | readonly AuthorityRuleInterface<string>[]
    | Promise<readonly AuthorityRuleInterface<string>[]>;
}

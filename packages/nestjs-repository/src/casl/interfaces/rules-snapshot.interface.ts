import { type Ability } from '@casl/ability';

import { type AuthorityRuleInterface } from '@concepta/nestjs-core';

/** An actor's rules on one ctx, as checked, and the ability built from them. */
export interface RulesSnapshot {
  readonly rules: readonly AuthorityRuleInterface<string>[];
  readonly ability: Ability<[string, string]>;
}

import { type AuthorityRuleInterface } from '@concepta/nestjs-core';

/**
 * Rules keyed by actor: `role:<name>` for each role, `system:<name>` for
 * each external system.
 */
export type AccessGrants = Record<string, AuthorityRuleInterface<string>[]>;

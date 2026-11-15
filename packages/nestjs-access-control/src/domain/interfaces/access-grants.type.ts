import { type AuthorityRuleInterface } from '@concepta/nestjs-core';

/**
 * Rules keyed by actor: `role:<name>` for each role, `system:<name>` for
 * each system, such as an integration or a scheduled job.
 */
export type AccessGrants = Record<string, AuthorityRuleInterface<string>[]>;

import { type AccessRuleInterface } from './access-rule.interface.js';

/**
 * Rules keyed by actor: `role:<name>` for each role, `system:<name>` for
 * each external system.
 */
export type AccessGrants = Record<string, AccessRuleInterface[]>;

import { type Ability } from '@casl/ability';

/**
 * A CASL ability over `<action>:<possession>` actions and resource
 * subjects.
 */
export type AccessAbility = Ability<[string, string]>;

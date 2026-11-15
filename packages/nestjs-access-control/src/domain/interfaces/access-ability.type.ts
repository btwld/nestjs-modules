import { type Ability } from '@casl/ability';

/**
 * A CASL ability over actions (`read`, `approve`) and resource subjects.
 */
export type AccessAbility = Ability<[string, string]>;

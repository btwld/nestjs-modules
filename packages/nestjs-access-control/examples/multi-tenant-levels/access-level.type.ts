/**
 * How much of an object a role may do, from nothing to everything. Admin
 * screens often show these instead of rules.
 */
export const ACCESS_LEVELS = [
  'none',
  'view-own',
  'view',
  'edit-own',
  'edit',
  'full',
] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];

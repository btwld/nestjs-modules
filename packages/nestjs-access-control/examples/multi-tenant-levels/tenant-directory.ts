import { type AccessLevel } from './access-level.type.js';

/**
 * Each role as a level per object, the way an admin screen shows it.
 */
export const ROLE_LEVELS: Record<string, Record<string, AccessLevel>> = {
  manager: { project: 'full', budget: 'view' },
  member: { project: 'edit-own', budget: 'none' },
  guest: { project: 'view', budget: 'none' },
  contractor: { project: 'view-own', budget: 'none' },
};

/**
 * The role each user holds in each tenant, standing in for your
 * memberships table. A user holds a role only in the tenants they belong
 * to, and a different one in each.
 */
export const MEMBERSHIPS: Record<string, Record<string, string>> = {
  alice: { acme: 'manager', globex: 'guest' },
  bob: { acme: 'member' },
  cara: { acme: 'contractor' },
};

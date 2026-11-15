/** A user as this application stores them: sign-in fields, then its own. */
export interface AttackUserInterface {
  id: string;
  email: string;
  username: string;
  active: boolean;
  roles: readonly string[];
  tenantId: string;
}

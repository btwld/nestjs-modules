/**
 * A system acting on its own authority, such as an integration or a
 * scheduled job. Checked as that system only, never as the roles of whatever
 * account it runs under.
 */
export interface SystemActorInterface {
  kind: 'system';
  name: string;
}

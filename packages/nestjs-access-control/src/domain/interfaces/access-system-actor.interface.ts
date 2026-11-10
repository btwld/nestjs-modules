/**
 * An external system acting on its own authority, such as an integration
 * consumer. Checked as that system only, never as the roles of whatever
 * account it runs under.
 */
export interface AccessSystemActorInterface {
  kind: 'system';
  name: string;
}

import { type AuthorityInterface } from '@concepta/nestjs-core';

/**
 * An authority access control shares with the repository, and the
 * resources it leaves to access control's own rules.
 */
export interface AccessControlAuthorityInterface {
  /** The authority, as the repository's governed entities use it. */
  authority: AuthorityInterface;
  /**
   * Resources the authority does not decide, such as a report no entity
   * stands behind: a route on one of them is decided by access control's
   * own rules alone. Every other route is decided by the authority first,
   * so a resource misnamed, or added and not listed here, is refused by it
   * rather than left to access control's rules.
   */
  except?: readonly string[];
}

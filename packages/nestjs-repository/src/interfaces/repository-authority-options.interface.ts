/**
 * How the deployment treats object authority, across every entity it
 * registers.
 */
export interface RepositoryAuthorityOptionsInterface {
  /**
   * The application is governed: every registered entity declares whether
   * an authority governs it, or that it is open, with a reason, or startup
   * fails. Off, an entity that declares nothing is open, with nobody having
   * decided so. Turn it on in any application that governs its data with an
   * authority.
   */
  required?: boolean;
}

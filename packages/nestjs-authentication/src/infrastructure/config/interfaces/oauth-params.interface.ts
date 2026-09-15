/**
 * Interface for OAuth authentication parameters that can be passed via query parameters
 */
export interface OAuthParamsInterface {
  /**
   * Comma-separated string of OAuth scopes
   */
  provider?: string;

  scopes?: string;

  state?: string;

  /**
   * Invitation token for associating new users with invitations
   */
  invite_token?: string;

  /**
   * URL to redirect to after successful authentication
   */
  redirect_to?: string;
}

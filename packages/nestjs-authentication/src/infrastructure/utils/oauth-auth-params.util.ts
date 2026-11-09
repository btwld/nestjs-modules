import { type OAuthAuthenticateOptionsInterface } from '../config/interfaces/oauth-authenticate-options.interface.js';
import { type OAuthParamsInterface } from '../config/interfaces/oauth-params.interface.js';

/**
 * Processes OAuth authentication parameters and returns auth options
 *
 * @param query - Query parameters from the OAuth request
 * @returns Auth options object with scope and state configured
 */
export function processOAuthParams(
  query: OAuthParamsInterface,
): OAuthAuthenticateOptionsInterface {
  const { provider, scopes, state, redirect_to } = query;

  const authOptions: OAuthAuthenticateOptionsInterface = {};

  // Handle scopes if provided
  if (scopes?.trim()) {
    authOptions.scope = scopes.split(',').map((s) => s.trim());
  }

  // Set state parameter to include provider information
  if (provider?.trim()) {
    // Create a state object with provider info and any existing state
    const stateData = {
      provider,
      ...(state?.trim() && { originalState: state }),
    };
    authOptions.state = JSON.stringify(stateData);
  } else if (state?.trim()) {
    authOptions.state = state;
  }

  if (redirect_to?.trim()) {
    authOptions.callbackURL = redirect_to;
  }

  return authOptions;
}

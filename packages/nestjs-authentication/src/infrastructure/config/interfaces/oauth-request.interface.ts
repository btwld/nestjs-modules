import { type Request } from 'express';

import { type OAuthParamsInterface } from './oauth-params.interface.js';

/**
 * Interface for OAuth authentication request with query parameters
 */
export interface OAuthRequestInterface extends Omit<Request, 'query'> {
  query: OAuthParamsInterface;
}

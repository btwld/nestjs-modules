import { type AuthenticationAccessInterface } from './authentication-access.interface.js';
import { type AuthenticationRefreshInterface } from './authentication-refresh.interface.js';

/**
 * Authentication response interface
 */
export interface AuthenticatedResponseInterface
  extends AuthenticationAccessInterface, AuthenticationRefreshInterface {}

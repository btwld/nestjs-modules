import { AuthenticationSettingsInterface } from './authentication-settings.interface';
import { IssueTokenServiceInterface } from './issue-token-service.interface';
import { ValidateTokenServiceInterface } from './validate-token-service.interface';
import { VerifyTokenServiceInterface } from './verify-token-service.interface';

/**
 * Authentication module configuration options interface
 */
export interface AuthenticationOptionsInterface {
  settings?: AuthenticationSettingsInterface;
  issueTokenService?: IssueTokenServiceInterface;
  verifyTokenService?: VerifyTokenServiceInterface;
  validateTokenService?: ValidateTokenServiceInterface;
}

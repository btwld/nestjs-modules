import { type IssueTokenServiceInterface } from '@concepta/nestjs-authentication';
import { type ModuleOptionsSettingsInterface } from '@concepta/nestjs-common';

import { type AuthGithubSettingsInterface } from './auth-github-settings.interface';

export interface AuthGithubOptionsInterface extends ModuleOptionsSettingsInterface<AuthGithubSettingsInterface> {
  /**
   * Implementation of a class to issue tokens, which is used as injection
   * in the controller to generate the response payload, with access token
   * and refresh token. If you overwrite the controller, the issueTokenService
   * won't be used, even if you overwrite it.
   */
  issueTokenService?: IssueTokenServiceInterface;

  /**
   * Settings
   */
  settings?: AuthGithubSettingsInterface;
}

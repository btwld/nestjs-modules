import { type IssueTokenServiceInterface } from '@concepta/nestjs-authentication';
import { type ModuleOptionsSettingsInterface } from '@concepta/nestjs-common';

import { type AuthGoogleSettingsInterface } from './auth-google-settings.interface';

export interface AuthGoogleOptionsInterface extends ModuleOptionsSettingsInterface<AuthGoogleSettingsInterface> {
  /**
   * Implementation of a class to issue tokens
   */
  issueTokenService?: IssueTokenServiceInterface;

  /**
   * Settings
   */
  settings?: AuthGoogleSettingsInterface;
}

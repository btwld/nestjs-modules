import { type IssueTokenServiceInterface } from '@concepta/nestjs-authentication';
import { type ModuleOptionsSettingsInterface } from '@concepta/nestjs-common';
import { type JwtVerifyServiceInterface } from '@concepta/nestjs-jwt';

import { type AuthAppleServiceInterface } from './auth-apple-service.interface';
import { type AuthAppleSettingsInterface } from './auth-apple-settings.interface';

export interface AuthAppleOptionsInterface extends ModuleOptionsSettingsInterface<AuthAppleSettingsInterface> {
  /**
   * Implementation of a class used to verify Apple tokens
   */
  jwtService?: JwtVerifyServiceInterface;

  /**
   * Implementation of a class to issue tokens
   */
  issueTokenService?: IssueTokenServiceInterface;

  /**
   * Implementation of a class to handle apple authentication
   */
  authAppleService?: AuthAppleServiceInterface;

  /**
   * Settings
   */
  settings?: AuthAppleSettingsInterface;
}

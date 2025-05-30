import zxcvbn from 'zxcvbn';

import { Inject, Injectable } from '@nestjs/common';

import { PasswordStrengthEnum } from '../enum/password-strength.enum';
import { PasswordSettingsInterface } from '../interfaces/password-settings.interface';
import { PasswordStrengthServiceInterface } from '../interfaces/password-strength-service.interface';
import { PASSWORD_MODULE_SETTINGS_TOKEN } from '../password.constants';

/**
 * Service to validate password strength
 */
@Injectable()
export class PasswordStrengthService
  implements PasswordStrengthServiceInterface
{
  /**
   * @param settings - Password module settings
   */
  constructor(
    @Inject(PASSWORD_MODULE_SETTINGS_TOKEN)
    protected readonly settings: PasswordSettingsInterface,
  ) {}

  /**
   * Method to check if password is strong
   *
   * @param password - the plain text password
   * @returns password strength
   */
  isStrong(password: string): boolean {
    // Get min password Strength
    const minStrength =
      this.settings?.minPasswordStrength || PasswordStrengthEnum.None;

    // check strength of the password
    const result = zxcvbn(password);

    // Check if is strong based on configuration
    return result.score >= minStrength;
  }
}

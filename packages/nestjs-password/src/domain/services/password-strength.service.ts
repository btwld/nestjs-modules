import zxcvbn from 'zxcvbn';

import { Injectable } from '@nestjs/common';

import { PasswordStrengthServiceInterface } from '../interfaces/password-strength-service.interface.js';
import { PasswordPolicy } from '../policies/password.policy.js';

/**
 * Service to validate password strength
 */
@Injectable()
export class PasswordStrengthService implements PasswordStrengthServiceInterface {
  constructor(private readonly policy: PasswordPolicy) {}

  /**
   * Method to check if password is strong
   *
   * @param password - the plain text password
   * @returns password strength
   */
  isStrong(password: string): boolean {
    const result = zxcvbn(password);
    return result.score >= this.policy.minPasswordStrength;
  }
}

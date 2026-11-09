import { Injectable } from '@nestjs/common';

import { PasswordCurrentRequiredException } from '../exceptions/password-current-required.exception.js';
import { PasswordNotStrongException } from '../exceptions/password-not-strong.exception.js';
import { PasswordUsedRecentlyException } from '../exceptions/password-used-recently.exception.js';
import { PasswordCreationServiceInterface } from '../interfaces/password-creation-service.interface.js';
import { PasswordCurrentPasswordInterface } from '../interfaces/password-current-password.interface.js';
import { PasswordHistoryPasswordInterface } from '../interfaces/password-history-password.interface.js';
import { PasswordStorageInterface } from '../password/interfaces/password-storage.interface.js';
import { PasswordPolicy } from '../policies/password.policy.js';

import { PasswordStorageService } from './password-storage.service.js';
import { PasswordStrengthService } from './password-strength.service.js';
import { PasswordValidationService } from './password-validation.service.js';

/**
 * Service with functions related to password creation
 */
@Injectable()
export class PasswordCreationService implements PasswordCreationServiceInterface {
  constructor(
    private readonly policy: PasswordPolicy,
    protected readonly passwordStorageService: PasswordStorageService,
    protected readonly passwordValidationService: PasswordValidationService,
    protected readonly passwordStrengthService: PasswordStrengthService,
  ) {}

  /**
   * Create a hashed password.
   *
   * @param password - Password to be hashed
   */
  async create(password: string): Promise<PasswordStorageInterface> {
    if (!this.passwordStrengthService.isStrong(password)) {
      throw new PasswordNotStrongException();
    }

    return this.passwordStorageService.hash(password);
  }

  public async validateCurrent(
    options: Partial<PasswordCurrentPasswordInterface>,
  ): Promise<boolean> {
    const { password, target: object } = options;

    // make sure the password is a string with some length
    if (typeof password === 'string' && password.length > 0 && object) {
      // validate it
      return this.passwordValidationService.validate({ password, ...object });
    } else {
      // settings say that current password is required?
      if (this.policy.requireCurrentToUpdate) {
        // reqs not met, throw exception
        throw new PasswordCurrentRequiredException();
      }
    }

    // valid by default
    return true;
  }

  public async validateHistory(
    options: PasswordHistoryPasswordInterface,
  ): Promise<boolean> {
    const { password, targets } = options;

    // make sure the password is a string with some length
    if (
      typeof password === 'string' &&
      password.length > 0 &&
      targets?.length
    ) {
      // validate each target
      for (const target of targets) {
        // check if historic password is valid
        const isValid = await this.passwordValidationService.validate({
          password,
          passwordHash: target.passwordHash,
        });

        // is valid?
        if (isValid) {
          throw new PasswordUsedRecentlyException();
        }
      }
    }

    // valid by default
    return true;
  }
}

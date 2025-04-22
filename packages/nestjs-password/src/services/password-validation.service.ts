import { Injectable } from '@nestjs/common';
import { CryptUtil } from '../utils/crypt.util';
import { PasswordValidationServiceInterface } from '../interfaces/password-validation-service.interface';
import { PasswordValidateOptionsInterface } from '../interfaces/password-validate-options.interface';

/**
 * Service with functions related to password validation
 */
@Injectable()
export class PasswordValidationService
  implements PasswordValidationServiceInterface
{
  /**
   * {@inheritDoc PasswordValidationServiceInterface.validate}
   */
  async validate(options: PasswordValidateOptionsInterface): Promise<boolean> {
    return CryptUtil.validatePassword(
      options.password,
      options.passwordHash,
      options.passwordSalt,
    );
  }
}

import { Injectable } from '@nestjs/common';

import { PasswordValidateOptionsInterface } from '../interfaces/password-validate-options.interface';
import { PasswordValidationServiceInterface } from '../interfaces/password-validation-service.interface';
import { CryptUtil } from '../utils/crypt.util';

/**
 * Service with functions related to password validation
 */
@Injectable()
export class PasswordValidationService
  implements PasswordValidationServiceInterface
{
  async validate(options: PasswordValidateOptionsInterface): Promise<boolean> {
    return CryptUtil.validatePassword(
      options.password,
      options.passwordHash,
      options.passwordSalt,
    );
  }
}

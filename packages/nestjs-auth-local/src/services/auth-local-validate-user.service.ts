import { Inject, Injectable } from '@nestjs/common';

import { ValidateUserService } from '@concepta/nestjs-authentication';
import { ReferenceIdInterface } from '@concepta/nestjs-common';
import { PasswordValidationServiceInterface } from '@concepta/nestjs-password';

import {
  AuthLocalPasswordValidationService,
  AuthLocalUserModelService,
} from '../auth-local.constants';
import { AuthLocalInvalidPasswordException } from '../exceptions/auth-local-invalid-password.exception';
import { AuthLocalUserInactiveException } from '../exceptions/auth-local-user-inactive.exception';
import { AuthLocalUsernameNotFoundException } from '../exceptions/auth-local-username-not-found.exception';
import { AuthLocalUserModelServiceInterface } from '../interfaces/auth-local-user-model-service.interface';
import { AuthLocalValidateUserServiceInterface } from '../interfaces/auth-local-validate-user-service.interface';
import { AuthLocalValidateUserInterface } from '../interfaces/auth-local-validate-user.interface';

@Injectable()
export class AuthLocalValidateUserService
  extends ValidateUserService<[AuthLocalValidateUserInterface]>
  implements AuthLocalValidateUserServiceInterface
{
  constructor(
    @Inject(AuthLocalUserModelService)
    protected readonly userModelService: AuthLocalUserModelServiceInterface,
    @Inject(AuthLocalPasswordValidationService)
    protected readonly passwordValidationService: PasswordValidationServiceInterface,
  ) {
    super();
  }

  /**
   * Returns true if user is considered valid for authentication purposes.
   */
  async validateUser(
    dto: AuthLocalValidateUserInterface,
  ): Promise<ReferenceIdInterface> {
    // try to get the user by username
    const user = await this.userModelService.byUsername(dto.username);

    // did we get a user?
    if (!user) {
      throw new AuthLocalUsernameNotFoundException(dto.username);
    }

    const isUserActive = await this.isActive(user);

    // is the user active?
    if (!isUserActive) {
      throw new AuthLocalUserInactiveException(dto.username);
    }

    // validate password
    const isValid = await this.passwordValidationService.validate({
      ...user,
      password: dto.password,
    });

    // password is valid?
    if (!isValid) {
      throw new AuthLocalInvalidPasswordException(user.username);
    }

    // return the user
    return user;
  }
}

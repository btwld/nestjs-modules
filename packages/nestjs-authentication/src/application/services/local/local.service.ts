import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';

import { ReferenceIdInterface } from '@concepta/nestjs-core';

import {
  AUTHENTICATION_PASSWORD_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { PasswordPort } from '../../../domain/ports/password.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { LocalInvalidPasswordException } from '../../exceptions/local-invalid-password.exception.js';
import { LocalUserInactiveException } from '../../exceptions/local-user-inactive.exception.js';
import { LocalUsernameNotFoundException } from '../../exceptions/local-username-not-found.exception.js';

import { LocalServiceInterface } from './interfaces/local-service.interface.js';
import { LocalValidateUserInterface } from './interfaces/local-validate-user.interface.js';

@Injectable()
export class LocalService implements LocalServiceInterface {
  constructor(
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    protected readonly userPort: UserPort,
    @Inject(AUTHENTICATION_PASSWORD_PORT_TOKEN)
    protected readonly passwordPort: PasswordPort,
  ) {}

  async validateUser(
    ctx: PlainLiteralObject,
    dto: LocalValidateUserInterface,
  ): Promise<ReferenceIdInterface> {
    const user = await this.userPort.getByUsername(ctx, dto.username);

    if (!user) {
      throw new LocalUsernameNotFoundException(dto.username);
    }

    if (user.active !== true) {
      throw new LocalUserInactiveException(dto.username);
    }

    const isValid = await this.passwordPort.validate(ctx, dto.password, user);

    if (!isValid) {
      throw new LocalInvalidPasswordException(user.username);
    }

    return user;
  }
}

import { Injectable } from '@nestjs/common';

import {
  AuthenticatedUserInterface,
  PasswordPlainCurrentInterface,
  PasswordStorageInterface,
  ReferenceIdInterface,
  PasswordPlainInterface,
} from '@concepta/nestjs-common';
import { UserPasswordServiceInterface } from '@concepta/nestjs-user';

@Injectable()
export class UserPasswordServiceFixture
  implements UserPasswordServiceInterface
{
  getPasswordStore(
    _userId: string,
  ): Promise<ReferenceIdInterface<string> & PasswordStorageInterface> {
    throw new Error('Method not implemented.');
  }
  setPassword(
    _passwordDto: PasswordPlainInterface &
      Partial<PasswordPlainCurrentInterface>,
    _userToUpdateId?: string,
    _authorizedUser?: AuthenticatedUserInterface,
  ): Promise<void> {
    return Promise.resolve();
  }
}

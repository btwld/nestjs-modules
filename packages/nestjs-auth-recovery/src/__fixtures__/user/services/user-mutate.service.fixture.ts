import { Injectable } from '@nestjs/common';
import { ReferenceIdInterface } from '@concepta/nestjs-common';
import { PasswordPlainInterface } from '@concepta/nestjs-common';

import { AuthRecoveryUserMutateServiceInterface } from '../../../interfaces/auth-recovery-user-mutate.service.interface';

import { UserFixture } from '../user.fixture';

@Injectable()
export class UserMutateServiceFixture
  implements AuthRecoveryUserMutateServiceInterface
{
  async update(
    object: ReferenceIdInterface<string> & PasswordPlainInterface,
  ): ReturnType<AuthRecoveryUserMutateServiceInterface['update']> {
    if (object.id === UserFixture.id) {
      return UserFixture;
    } else {
      throw new Error();
    }
  }
}

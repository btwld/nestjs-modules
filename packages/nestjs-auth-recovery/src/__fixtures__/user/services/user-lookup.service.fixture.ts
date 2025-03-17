import { Injectable } from '@nestjs/common';
import {
  ReferenceEmail,
  ReferenceIdInterface,
  ReferenceSubject,
} from '@concepta/nestjs-common';

import { AuthRecoveryUserLookupServiceInterface } from '../../../interfaces/auth-recovery-user-lookup.service.interface';

import { UserFixture } from '../user.fixture';

@Injectable()
export class UserLookupServiceFixture
  implements AuthRecoveryUserLookupServiceInterface
{
  async byId(
    id: string,
  ): ReturnType<AuthRecoveryUserLookupServiceInterface['byId']> {
    if (id === UserFixture.id) {
      return UserFixture;
    } else {
      throw new Error();
    }
  }

  async byEmail(
    email: ReferenceEmail,
  ): ReturnType<AuthRecoveryUserLookupServiceInterface['byEmail']> {
    return email === UserFixture.email ? UserFixture : null;
  }

  async bySubject(subject: ReferenceSubject): Promise<ReferenceIdInterface> {
    throw new Error(`Method not implemented, can't get ${subject}.`);
  }
}

import { IsString } from 'class-validator';

import { ReferenceIdInterface } from '@concepta/nestjs-common';

import { AuthLocalCredentialsInterface } from '../../interfaces/auth-local-credentials.interface';

export class UserFixture
  implements ReferenceIdInterface, AuthLocalCredentialsInterface
{
  id!: string;

  @IsString()
  username!: string;

  active!: boolean;

  @IsString()
  password!: string;

  passwordHash!: string;

  passwordSalt!: string;
}

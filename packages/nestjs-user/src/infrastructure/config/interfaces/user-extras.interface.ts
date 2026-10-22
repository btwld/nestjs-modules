import { type DynamicModule, type Provider, type Type } from '@nestjs/common';

import { type UserCredentialsRepositoryInterface } from '../../../domain/repositories/user-credentials-repository.interface.js';
import { type UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';

export interface UserExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  entities: {
    user: string;
    credentials?: string;
  };
  repositories?: {
    user?: Type<UserRepositoryInterface>;
    userCredentials?: Type<UserCredentialsRepositoryInterface>;
  };
}

import { type DynamicModule, type Provider } from '@nestjs/common';

import { type UserCredentialsRepositoryInterface } from '../../../domain/repositories/user-credentials-repository.interface.js';
import { type UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { type UserCredentialsRepository } from '../../persistence/user-credentials.repository.js';
import { type UserRepository } from '../../persistence/user.repository.js';

/**
 * A repository class built around the registered user entity's repository
 * and the module's mapper. Extend `UserRepository` to write one.
 */
export type UserRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof UserRepository>
) => UserRepositoryInterface;

/**
 * A repository class built around the registered credentials entity's
 * repository and the module's mapper. Extend `UserCredentialsRepository` to
 * write one.
 */
export type UserCredentialsRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof UserCredentialsRepository>
) => UserCredentialsRepositoryInterface;

export interface UserExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  entities: {
    user: string;
    credentials?: string;
  };
  repositories?: {
    user?: UserRepositoryConstructor;
    userCredentials?: UserCredentialsRepositoryConstructor;
  };
}

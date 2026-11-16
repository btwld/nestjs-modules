import { type ReferenceActiveInterface } from '@concepta/nestjs-core';
import { type PasswordStorageInterface } from '@concepta/nestjs-password';

import { type UserOwnableInterface } from './user-ownable.interface.js';

export interface UserCredentialInterface
  extends
    PasswordStorageInterface,
    UserOwnableInterface,
    ReferenceActiveInterface {
  validFrom: Date;
  validTo: Date | null;
}

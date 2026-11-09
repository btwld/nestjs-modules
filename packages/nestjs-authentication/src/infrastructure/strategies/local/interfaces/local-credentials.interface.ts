import {
  type ReferenceActiveInterface,
  type ReferenceIdInterface,
  type ReferenceUsernameInterface,
} from '@concepta/nestjs-core';
import { type PasswordStorageInterface } from '@concepta/nestjs-password';

export interface LocalCredentialsInterface
  extends
    ReferenceIdInterface,
    ReferenceUsernameInterface,
    ReferenceActiveInterface,
    PasswordStorageInterface {}

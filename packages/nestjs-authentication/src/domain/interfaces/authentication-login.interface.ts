import { type ReferenceUsernameInterface } from '@concepta/nestjs-core';
import { type PasswordPlainInterface } from '@concepta/nestjs-password';

export interface AuthenticationLoginInterface
  extends ReferenceUsernameInterface, PasswordPlainInterface {}

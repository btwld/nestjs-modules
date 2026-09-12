import { type PasswordPlainInterface } from '@concepta/nestjs-password';

import { type UserInterface } from './user.interface.js';

export interface UserCreatableInterface
  extends
    Pick<UserInterface, 'username' | 'email'>,
    Partial<Pick<UserInterface, 'active'>>,
    Partial<PasswordPlainInterface> {}

import { type ReferenceId } from '@concepta/nestjs-core';

import { type UserInterface } from './user.interface.js';

export interface UserOwnableInterface {
  userId: ReferenceId;
  user?: UserInterface;
}

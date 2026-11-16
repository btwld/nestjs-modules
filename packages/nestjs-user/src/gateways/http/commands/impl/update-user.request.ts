import { CrudUpdateCommand } from '@concepta/nestjs-crud';

import { type UserUpdatableInterface } from '../../../../domain/interfaces/user-updatable.interface.js';
import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class UpdateUserRequest extends CrudUpdateCommand<
  UserInterface,
  UserUpdatableInterface
> {}

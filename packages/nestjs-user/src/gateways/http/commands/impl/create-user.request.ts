import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type UserCreatableInterface } from '../../../../domain/interfaces/user-creatable.interface.js';
import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class CreateUserRequest extends CrudCreateCommand<
  UserInterface,
  UserCreatableInterface
> {}

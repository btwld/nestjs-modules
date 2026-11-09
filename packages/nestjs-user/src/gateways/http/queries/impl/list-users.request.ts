import { CrudListQuery } from '@concepta/nestjs-crud';

import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class ListUsersRequest extends CrudListQuery<UserInterface> {}

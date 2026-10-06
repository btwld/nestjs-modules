import { CrudListHandler } from '@concepta/nestjs-crud';

import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class ListUsersRequestHandler extends CrudListHandler<UserInterface> {}

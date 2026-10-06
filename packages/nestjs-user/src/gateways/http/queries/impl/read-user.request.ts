import { CrudReadQuery } from '@concepta/nestjs-crud';

import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class ReadUserRequest extends CrudReadQuery<UserInterface> {}

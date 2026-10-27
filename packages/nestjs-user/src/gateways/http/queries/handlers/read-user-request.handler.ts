import { CrudReadHandler } from '@concepta/nestjs-crud';

import { type UserInterface } from '../../../../domain/interfaces/user.interface.js';

export class ReadUserRequestHandler extends CrudReadHandler<UserInterface> {}

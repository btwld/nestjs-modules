import { CrudUpdateCommand } from '@concepta/nestjs-crud';
import { type PasswordUpdateInterface } from '@concepta/nestjs-password';

export class UpdateUserPasswordRequest extends CrudUpdateCommand<
  PasswordUpdateInterface,
  PasswordUpdateInterface
> {}

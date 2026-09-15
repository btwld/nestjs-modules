import { Command } from '@nestjs/cqrs';

import { type PasswordValidateOptionsInterface } from '../../../domain/interfaces/password-validate-options.interface.js';

export class ValidatePasswordCommand extends Command<boolean> {
  constructor(public readonly options: PasswordValidateOptionsInterface) {
    super();
  }
}

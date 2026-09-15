import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PasswordValidationService } from '../../../domain/services/password-validation.service.js';
import { ValidatePasswordCommand } from '../impl/validate-password.command.js';

@CommandHandler(ValidatePasswordCommand)
export class ValidatePasswordHandler implements ICommandHandler<ValidatePasswordCommand> {
  constructor(
    private readonly passwordValidationService: PasswordValidationService,
  ) {}

  async execute(command: ValidatePasswordCommand): Promise<boolean> {
    return this.passwordValidationService.validate(command.options);
  }
}

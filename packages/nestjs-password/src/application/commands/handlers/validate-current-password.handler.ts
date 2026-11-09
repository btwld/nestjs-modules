import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PasswordCreationService } from '../../../domain/services/password-creation.service.js';
import { ValidateCurrentPasswordCommand } from '../impl/validate-current-password.command.js';

@CommandHandler(ValidateCurrentPasswordCommand)
export class ValidateCurrentPasswordHandler implements ICommandHandler<ValidateCurrentPasswordCommand> {
  constructor(
    private readonly passwordCreationService: PasswordCreationService,
  ) {}

  async execute(command: ValidateCurrentPasswordCommand): Promise<boolean> {
    const { password, target } = command;
    return this.passwordCreationService.validateCurrent({ password, target });
  }
}

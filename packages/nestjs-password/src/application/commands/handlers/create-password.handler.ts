import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PasswordStorageInterface } from '../../../domain/password/interfaces/password-storage.interface.js';
import { PasswordCreationService } from '../../../domain/services/password-creation.service.js';
import { CreatePasswordCommand } from '../impl/create-password.command.js';

@CommandHandler(CreatePasswordCommand)
export class CreatePasswordHandler implements ICommandHandler<CreatePasswordCommand> {
  constructor(
    private readonly passwordCreationService: PasswordCreationService,
  ) {}

  async execute(
    command: CreatePasswordCommand,
  ): Promise<PasswordStorageInterface> {
    return this.passwordCreationService.create(command.password);
  }
}

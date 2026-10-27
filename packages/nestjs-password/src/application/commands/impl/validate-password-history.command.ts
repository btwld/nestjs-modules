import { Command } from '@nestjs/cqrs';

import { type PasswordStorageInterface } from '../../../domain/password/interfaces/password-storage.interface.js';

export class ValidatePasswordHistoryCommand extends Command<boolean> {
  constructor(
    public readonly password: string,
    public readonly targets: PasswordStorageInterface[],
  ) {
    super();
  }
}

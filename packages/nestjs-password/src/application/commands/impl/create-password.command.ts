import { Command } from '@nestjs/cqrs';

import { type PasswordStorageInterface } from '../../../domain/password/interfaces/password-storage.interface.js';

export class CreatePasswordCommand extends Command<PasswordStorageInterface> {
  constructor(public readonly password: string) {
    super();
  }
}

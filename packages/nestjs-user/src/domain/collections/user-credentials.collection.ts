import { type ReferenceIdInterface } from '@concepta/nestjs-core';
import { type PasswordStorageInterface } from '@concepta/nestjs-password';

import { UserPasswordHistoryViolationException } from '../exceptions/user-password-history-violation.exception.js';
import { type UserPasswordPort } from '../ports/user-password.port.js';

export class UserCredentialsCollection {
  constructor(
    readonly entries: (ReferenceIdInterface & PasswordStorageInterface)[],
    private readonly passwordPort: UserPasswordPort,
  ) {}

  async notReused(password: string): Promise<void> {
    const isValid = await this.passwordPort.validateHistory(
      password,
      this.entries,
    );

    if (!isValid) {
      throw new UserPasswordHistoryViolationException();
    }
  }
}

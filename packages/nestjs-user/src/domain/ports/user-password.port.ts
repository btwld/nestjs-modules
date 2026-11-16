import { Injectable, Type } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { ReferenceIdInterface } from '@concepta/nestjs-core';
import { PasswordStorageInterface } from '@concepta/nestjs-password';

export interface CreatePasswordCommandInterface {
  password: string;
}

export interface ValidateCurrentPasswordCommandInterface {
  password: string;
  target: PasswordStorageInterface;
}

export interface ValidatePasswordHistoryCommandInterface {
  password: string;
  targets: PasswordStorageInterface[];
}

export interface UserPasswordPortSettings {
  createCommand: Type<CreatePasswordCommandInterface>;
  validateCurrentCommand: Type<ValidateCurrentPasswordCommandInterface>;
  validateHistoryCommand?: Type<ValidatePasswordHistoryCommandInterface>;
}

@Injectable()
export class UserPasswordPort {
  constructor(
    private readonly portSettings: UserPasswordPortSettings,
    private readonly commandBus: CommandBus,
  ) {}

  async create(password: string): Promise<PasswordStorageInterface> {
    return this.commandBus.execute(
      new this.portSettings.createCommand(password),
    );
  }

  async validateCurrent(
    password: string,
    target: ReferenceIdInterface & PasswordStorageInterface,
  ): Promise<boolean> {
    return this.commandBus.execute(
      new this.portSettings.validateCurrentCommand(password, target),
    );
  }

  async validateHistory(
    password: string,
    targets: PasswordStorageInterface[],
  ): Promise<boolean> {
    if (!this.portSettings.validateHistoryCommand) {
      return true;
    }

    return this.commandBus.execute(
      new this.portSettings.validateHistoryCommand(password, targets),
    );
  }
}

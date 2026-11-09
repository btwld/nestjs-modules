import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';

import { ReferenceId, ReferenceIdInterface } from '@concepta/nestjs-core';

export interface ValidatePasswordCommandInterface extends Command<boolean> {
  ctx: PlainLiteralObject;
  password: string;
  target: ReferenceIdInterface;
}

export interface SetPasswordCommandInterface extends Command<void> {
  ctx: PlainLiteralObject;
  password: string;
  assigneeId: ReferenceId;
}

export interface PasswordPortSettings {
  validateCommand: Type<ValidatePasswordCommandInterface>;
  setPasswordCommand: Type<SetPasswordCommandInterface>;
}

@Injectable()
export class PasswordPort {
  constructor(
    private readonly portSettings: PasswordPortSettings,
    private readonly commandBus: CommandBus,
  ) {}

  async validate(
    ctx: PlainLiteralObject,
    password: string,
    target: ReferenceIdInterface,
  ): Promise<boolean> {
    return this.commandBus.execute(
      new this.portSettings.validateCommand(ctx, password, target),
    );
  }

  async setPassword(
    ctx: PlainLiteralObject,
    password: string,
    assigneeId: ReferenceId,
  ): Promise<void> {
    return this.commandBus.execute(
      new this.portSettings.setPasswordCommand(ctx, password, assigneeId),
    );
  }
}

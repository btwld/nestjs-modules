import { type PlainLiteralObject } from '@nestjs/common';
import {
  Command,
  CommandHandler,
  type ICommandHandler,
  type IQueryHandler,
  Query,
  QueryHandler,
} from '@nestjs/cqrs';

import {
  type AuthenticationOtpCreatableInterface,
  type AuthenticationOtpInterface,
  type AuthenticationUserInterface,
  type AuthenticationUserResult,
  type ClearOtpCommandInterface,
  type CreateOtpCommandInterface,
  type GetUserByEmailQueryInterface,
  type GetUserByIdQueryInterface,
  type GetUserBySubjectQueryInterface,
  type GetUserByUsernameQueryInterface,
  type OtpPortSettings,
  type PasswordPortSettings,
  type RecoveryNotificationPortSettings,
  type SendPasswordUpdatedNotificationCommandInterface,
  type SendRecoverLoginNotificationCommandInterface,
  type SendRecoverPasswordNotificationCommandInterface,
  type SendVerifyNotificationCommandInterface,
  type SetPasswordCommandInterface,
  type UpdateUserCommandInterface,
  type UserPortSettings,
  type ValidateOtpQueryInterface,
  type ValidatePasswordCommandInterface,
  type VerifyNotificationPortSettings,
} from '@concepta/nestjs-authentication';
import {
  type AssigneeRelationInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-core';

import { AttackUserStore } from './attack-user.store.js';

// The user port: authentication looks users up through these, over the
// application's own user table.

export class GetAttackUserByIdQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByIdQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: string,
  ) {
    super();
  }
}

export class GetAttackUserBySubjectQuery
  extends Query<AuthenticationUserResult>
  implements GetUserBySubjectQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly subject: string,
  ) {
    super();
  }
}

export class GetAttackUserByUsernameQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByUsernameQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly username: string,
  ) {
    super();
  }
}

export class GetAttackUserByEmailQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByEmailQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
  ) {
    super();
  }
}

export class UpdateAttackUserCommand
  extends Command<AuthenticationUserResult>
  implements UpdateUserCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: string,
    public readonly dto: Partial<AuthenticationUserInterface>,
  ) {
    super();
  }
}

@QueryHandler(GetAttackUserByIdQuery)
export class GetAttackUserByIdHandler implements IQueryHandler<GetAttackUserByIdQuery> {
  constructor(private readonly users: AttackUserStore) {}

  async execute(
    query: GetAttackUserByIdQuery,
  ): Promise<AuthenticationUserResult> {
    return this.users.byId(query.id);
  }
}

@QueryHandler(GetAttackUserBySubjectQuery)
export class GetAttackUserBySubjectHandler implements IQueryHandler<GetAttackUserBySubjectQuery> {
  constructor(private readonly users: AttackUserStore) {}

  async execute(
    query: GetAttackUserBySubjectQuery,
  ): Promise<AuthenticationUserResult> {
    return this.users.byId(query.subject);
  }
}

@QueryHandler(GetAttackUserByUsernameQuery)
export class GetAttackUserByUsernameHandler implements IQueryHandler<GetAttackUserByUsernameQuery> {
  constructor(private readonly users: AttackUserStore) {}

  async execute(
    query: GetAttackUserByUsernameQuery,
  ): Promise<AuthenticationUserResult> {
    return this.users.find((entry) => entry.username === query.username);
  }
}

@QueryHandler(GetAttackUserByEmailQuery)
export class GetAttackUserByEmailHandler implements IQueryHandler<GetAttackUserByEmailQuery> {
  constructor(private readonly users: AttackUserStore) {}

  async execute(
    query: GetAttackUserByEmailQuery,
  ): Promise<AuthenticationUserResult> {
    return this.users.find((entry) => entry.email === query.email);
  }
}

@CommandHandler(UpdateAttackUserCommand)
export class UpdateAttackUserHandler implements ICommandHandler<UpdateAttackUserCommand> {
  constructor(private readonly users: AttackUserStore) {}

  async execute(
    command: UpdateAttackUserCommand,
  ): Promise<AuthenticationUserResult> {
    this.users.update(command.id, command.dto);
    return this.users.byId(command.id);
  }
}

export const attackUserPortSettings: UserPortSettings = {
  getByIdQuery: GetAttackUserByIdQuery,
  getBySubjectQuery: GetAttackUserBySubjectQuery,
  getByUsernameQuery: GetAttackUserByUsernameQuery,
  getByEmailQuery: GetAttackUserByEmailQuery,
  updateCommand: UpdateAttackUserCommand,
};

export const attackUserPortHandlers = [
  GetAttackUserByIdHandler,
  GetAttackUserBySubjectHandler,
  GetAttackUserByUsernameHandler,
  GetAttackUserByEmailHandler,
  UpdateAttackUserHandler,
];

// The ports authentication requires beside the user port. This application
// signs in with bearer tokens only, so none of them is ever dispatched, and
// no handler is registered for them.

class AttackValidatePasswordCommand
  extends Command<boolean>
  implements ValidatePasswordCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly password: string,
    public readonly target: ReferenceIdInterface,
  ) {
    super();
  }
}

class AttackSetPasswordCommand
  extends Command<void>
  implements SetPasswordCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly password: string,
    public readonly assigneeId: string,
  ) {
    super();
  }
}

export const attackPasswordPortSettings: PasswordPortSettings = {
  validateCommand: AttackValidatePasswordCommand,
  setPasswordCommand: AttackSetPasswordCommand,
};

class AttackCreateOtpCommand
  extends Command<AuthenticationOtpInterface>
  implements CreateOtpCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: AuthenticationOtpCreatableInterface,
  ) {
    super();
  }
}

class AttackValidateOtpQuery
  extends Query<AssigneeRelationInterface | null>
  implements ValidateOtpQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<
      AuthenticationOtpInterface,
      'category' | 'passcode'
    >,
  ) {
    super();
  }
}

class AttackClearOtpCommand
  extends Command<void>
  implements ClearOtpCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<
      AuthenticationOtpInterface,
      'category' | 'assigneeId'
    >,
  ) {
    super();
  }
}

export const attackOtpPortSettings: OtpPortSettings = {
  createCommand: AttackCreateOtpCommand,
  validateQuery: AttackValidateOtpQuery,
  clearCommand: AttackClearOtpCommand,
};

class AttackSendRecoverLoginCommand
  extends Command<void>
  implements SendRecoverLoginNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly username: string,
  ) {
    super();
  }
}

class AttackSendRecoverPasswordCommand
  extends Command<void>
  implements SendRecoverPasswordNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly passcode: string,
    public readonly tokenExp: Date,
  ) {
    super();
  }
}

class AttackSendPasswordUpdatedCommand
  extends Command<void>
  implements SendPasswordUpdatedNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
  ) {
    super();
  }
}

export const attackRecoveryNotificationPortSettings: RecoveryNotificationPortSettings =
  {
    sendRecoverLoginNotificationCommand: AttackSendRecoverLoginCommand,
    sendRecoverPasswordNotificationCommand: AttackSendRecoverPasswordCommand,
    sendPasswordUpdatedNotificationCommand: AttackSendPasswordUpdatedCommand,
  };

class AttackSendVerifyCommand
  extends Command<void>
  implements SendVerifyNotificationCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
    public readonly passcode: string,
    public readonly tokenExp: Date,
  ) {
    super();
  }
}

export const attackVerifyNotificationPortSettings: VerifyNotificationPortSettings =
  { sendVerifyNotificationCommand: AttackSendVerifyCommand };

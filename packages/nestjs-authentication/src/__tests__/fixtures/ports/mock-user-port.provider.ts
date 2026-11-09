import { PlainLiteralObject, Provider } from '@nestjs/common';
import {
  Command,
  CommandBus,
  CommandHandler,
  ICommandHandler,
  IQueryHandler,
  Query,
  QueryBus,
  QueryHandler,
} from '@nestjs/cqrs';

import {
  ReferenceEmail,
  ReferenceId,
  ReferenceSubject,
} from '@concepta/nestjs-core';

import { AUTHENTICATION_USER_PORT_TOKEN } from '../../../authentication.constants.js';
import {
  AuthenticationUserInterface,
  AuthenticationUserResult,
  GetUserByEmailQueryInterface,
  GetUserByIdQueryInterface,
  GetUserBySubjectQueryInterface,
  GetUserByUsernameQueryInterface,
  UpdateUserCommandInterface,
  UserPort,
  UserPortSettings,
} from '../../../domain/ports/user.port.js';

// ── Mock queries/commands ──

export class MockGetUserByIdQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByIdQueryInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public id: ReferenceId,
  ) {
    super();
  }
}

export class MockGetUserBySubjectQuery
  extends Query<AuthenticationUserResult>
  implements GetUserBySubjectQueryInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public subject: ReferenceSubject,
  ) {
    super();
  }
}

export class MockGetUserByUsernameQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByUsernameQueryInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public username: string,
  ) {
    super();
  }
}

export class MockGetUserByEmailQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByEmailQueryInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public email: ReferenceEmail,
  ) {
    super();
  }
}

export class MockUpdateUserCommand
  extends Command<AuthenticationUserResult>
  implements UpdateUserCommandInterface
{
  constructor(
    public ctx: PlainLiteralObject,
    public id: ReferenceId,
    public dto: Partial<AuthenticationUserInterface>,
  ) {
    super();
  }
}

// ── Mock handlers ──

@QueryHandler(MockGetUserByIdQuery)
export class MockGetUserByIdHandler implements IQueryHandler<MockGetUserByIdQuery> {
  async execute(
    _query: MockGetUserByIdQuery,
  ): Promise<AuthenticationUserResult> {
    return null;
  }
}

@QueryHandler(MockGetUserBySubjectQuery)
export class MockGetUserBySubjectHandler implements IQueryHandler<MockGetUserBySubjectQuery> {
  async execute(
    _query: MockGetUserBySubjectQuery,
  ): Promise<AuthenticationUserResult> {
    return null;
  }
}

@QueryHandler(MockGetUserByUsernameQuery)
export class MockGetUserByUsernameHandler implements IQueryHandler<MockGetUserByUsernameQuery> {
  async execute(
    _query: MockGetUserByUsernameQuery,
  ): Promise<AuthenticationUserResult> {
    return null;
  }
}

@QueryHandler(MockGetUserByEmailQuery)
export class MockGetUserByEmailHandler implements IQueryHandler<MockGetUserByEmailQuery> {
  async execute(
    _query: MockGetUserByEmailQuery,
  ): Promise<AuthenticationUserResult> {
    return null;
  }
}

@CommandHandler(MockUpdateUserCommand)
export class MockUpdateUserHandler implements ICommandHandler<MockUpdateUserCommand> {
  async execute(
    _command: MockUpdateUserCommand,
  ): Promise<AuthenticationUserResult> {
    return null;
  }
}

// ── Port settings ──

export const mockUserPortSettings: UserPortSettings = {
  getByIdQuery: MockGetUserByIdQuery,
  getBySubjectQuery: MockGetUserBySubjectQuery,
  getByUsernameQuery: MockGetUserByUsernameQuery,
  getByEmailQuery: MockGetUserByEmailQuery,
  updateCommand: MockUpdateUserCommand,
};

// ── Reusable mock handlers array ──

export const mockUserPortHandlers = [
  MockGetUserByIdHandler,
  MockGetUserBySubjectHandler,
  MockGetUserByUsernameHandler,
  MockGetUserByEmailHandler,
  MockUpdateUserHandler,
];

// ── Provider factory ──

export function createMockUserPortProvider(
  settings: UserPortSettings = mockUserPortSettings,
): Provider {
  return {
    provide: AUTHENTICATION_USER_PORT_TOKEN,
    inject: [QueryBus, CommandBus],
    useFactory: (queryBus: QueryBus, commandBus: CommandBus) =>
      new UserPort(settings, queryBus, commandBus),
  };
}

import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus, Query, QueryBus } from '@nestjs/cqrs';

import {
  ReferenceEmail,
  ReferenceId,
  ReferenceIdInterface,
  ReferenceSubject,
} from '@concepta/nestjs-core';

export interface AuthenticationUserInterface {
  email: ReferenceEmail;
  username: string;
  active: boolean;
}

export type AuthenticationUserResult =
  (ReferenceIdInterface & AuthenticationUserInterface) | null;

export interface GetUserByIdQueryInterface extends Query<AuthenticationUserResult> {
  ctx: PlainLiteralObject;
  id: ReferenceId;
}

export interface GetUserBySubjectQueryInterface extends Query<AuthenticationUserResult> {
  ctx: PlainLiteralObject;
  subject: ReferenceSubject;
}

export interface GetUserByUsernameQueryInterface extends Query<AuthenticationUserResult> {
  ctx: PlainLiteralObject;
  username: string;
}

export interface GetUserByEmailQueryInterface extends Query<AuthenticationUserResult> {
  ctx: PlainLiteralObject;
  email: ReferenceEmail;
}

export interface UpdateUserCommandInterface extends Command<AuthenticationUserResult> {
  ctx: PlainLiteralObject;
  id: ReferenceId;
  dto: Partial<AuthenticationUserInterface>;
}

export interface UserPortSettings {
  getByIdQuery: Type<GetUserByIdQueryInterface>;
  getBySubjectQuery: Type<GetUserBySubjectQueryInterface>;
  getByUsernameQuery: Type<GetUserByUsernameQueryInterface>;
  getByEmailQuery: Type<GetUserByEmailQueryInterface>;
  updateCommand: Type<UpdateUserCommandInterface>;
}

@Injectable()
export class UserPort {
  constructor(
    private readonly portSettings: UserPortSettings,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getById(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<AuthenticationUserResult> {
    return this.queryBus.execute(new this.portSettings.getByIdQuery(ctx, id));
  }

  async getBySubject(
    ctx: PlainLiteralObject,
    subject: ReferenceSubject,
  ): Promise<AuthenticationUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getBySubjectQuery(ctx, subject),
    );
  }

  async getByUsername(
    ctx: PlainLiteralObject,
    username: string,
  ): Promise<AuthenticationUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByUsernameQuery(ctx, username),
    );
  }

  async getByEmail(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
  ): Promise<AuthenticationUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByEmailQuery(ctx, email),
    );
  }

  async update(
    ctx: PlainLiteralObject,
    id: ReferenceId,
    dto: Partial<AuthenticationUserInterface>,
  ): Promise<AuthenticationUserResult> {
    return this.commandBus.execute(
      new this.portSettings.updateCommand(ctx, id, dto),
    );
  }
}

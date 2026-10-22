import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  ReferenceEmail,
  ReferenceEmailInterface,
  ReferenceId,
  ReferenceUsernameInterface,
} from '@concepta/nestjs-core';

import { FederatedCredentialsInterface } from '../../interfaces/federated-credentials.interface.js';

export type FederatedUserResult = FederatedCredentialsInterface | null;

export interface GetUserByIdQueryInterface {
  ctx: PlainLiteralObject;
  id: ReferenceId;
}

export interface GetUserByEmailQueryInterface {
  ctx: PlainLiteralObject;
  email: ReferenceEmail;
}

export interface CreateUserCommandInterface {
  ctx: PlainLiteralObject;
  dto: ReferenceEmailInterface & ReferenceUsernameInterface;
}

export interface FederatedUserPortSettings {
  getByIdQuery: Type<GetUserByIdQueryInterface>;
  getByEmailQuery: Type<GetUserByEmailQueryInterface>;
  createCommand: Type<CreateUserCommandInterface>;
}

@Injectable()
export class FederatedUserPort {
  constructor(
    private readonly portSettings: FederatedUserPortSettings,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getById(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
  ): Promise<FederatedUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByIdQuery(ctx, userId),
    );
  }

  async getByEmail(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
  ): Promise<FederatedUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByEmailQuery(ctx, email),
    );
  }

  async create(
    ctx: PlainLiteralObject,
    dto: ReferenceEmailInterface & ReferenceUsernameInterface,
  ): Promise<FederatedCredentialsInterface> {
    return this.commandBus.execute(
      new this.portSettings.createCommand(ctx, dto),
    );
  }
}

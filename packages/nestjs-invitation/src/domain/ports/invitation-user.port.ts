import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import {
  ReferenceEmail,
  ReferenceId,
  ReferenceIdInterface,
} from '@concepta/nestjs-core';

import { InvitationUserInterface } from '../interfaces/invitation-user.interface.js';

export type InvitationUserResult =
  (ReferenceIdInterface & InvitationUserInterface) | null;

export interface GetUserByIdQueryInterface {
  ctx: PlainLiteralObject;
  id: ReferenceId;
}

export interface GetUserByEmailQueryInterface {
  ctx: PlainLiteralObject;
  email: ReferenceEmail;
}

export interface InvitationUserPortSettings {
  getByIdQuery: Type<GetUserByIdQueryInterface>;
  getByEmailQuery: Type<GetUserByEmailQueryInterface>;
}

@Injectable()
export class InvitationUserPort {
  constructor(
    private readonly portSettings: InvitationUserPortSettings,
    private readonly queryBus: QueryBus,
  ) {}

  async getById(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
  ): Promise<InvitationUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByIdQuery(ctx, userId),
    );
  }

  async getByEmail(
    ctx: PlainLiteralObject,
    email: ReferenceEmail,
  ): Promise<InvitationUserResult> {
    return this.queryBus.execute(
      new this.portSettings.getByEmailQuery(ctx, email),
    );
  }
}

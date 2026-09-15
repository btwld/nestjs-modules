import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus, Query, QueryBus } from '@nestjs/cqrs';

import { AuthorizationPayloadInterface } from '../interfaces/authorization-payload.interface.js';

export interface IssueTokenCommandInterface extends Command<string> {
  ctx: PlainLiteralObject;
  payload: AuthorizationPayloadInterface;
}

export interface VerifyTokenQueryInterface extends Query<PlainLiteralObject> {
  ctx: PlainLiteralObject;
  token: string;
}

export interface ValidateTokenQueryInterface extends Query<boolean> {
  ctx: PlainLiteralObject;
  payload: PlainLiteralObject;
}

export interface TokenPortSettings {
  issueAccessTokenCommand: Type<IssueTokenCommandInterface>;
  issueRefreshTokenCommand: Type<IssueTokenCommandInterface>;
  verifyAccessTokenQuery: Type<VerifyTokenQueryInterface>;
  verifyRefreshTokenQuery: Type<VerifyTokenQueryInterface>;
  validateTokenQuery: Type<ValidateTokenQueryInterface>;
}

@Injectable()
export class TokenPort {
  constructor(
    private readonly portSettings: TokenPortSettings,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async issueAccessToken(
    ctx: PlainLiteralObject,
    payload: AuthorizationPayloadInterface,
  ): Promise<string> {
    return this.commandBus.execute(
      new this.portSettings.issueAccessTokenCommand(ctx, payload),
    );
  }

  async issueRefreshToken(
    ctx: PlainLiteralObject,
    payload: AuthorizationPayloadInterface,
  ): Promise<string> {
    return this.commandBus.execute(
      new this.portSettings.issueRefreshTokenCommand(ctx, payload),
    );
  }

  async verifyAccessToken(
    ctx: PlainLiteralObject,
    token: string,
  ): Promise<PlainLiteralObject> {
    return this.queryBus.execute(
      new this.portSettings.verifyAccessTokenQuery(ctx, token),
    );
  }

  async verifyRefreshToken(
    ctx: PlainLiteralObject,
    token: string,
  ): Promise<PlainLiteralObject> {
    return this.queryBus.execute(
      new this.portSettings.verifyRefreshTokenQuery(ctx, token),
    );
  }

  async validateToken(
    ctx: PlainLiteralObject,
    payload: PlainLiteralObject,
  ): Promise<boolean> {
    return this.queryBus.execute(
      new this.portSettings.validateTokenQuery(ctx, payload),
    );
  }
}

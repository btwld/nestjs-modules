import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus, Query, QueryBus } from '@nestjs/cqrs';

import { Token } from '../../domain/aggregates/token.aggregate.js';

export interface SignTokenCommandInterface extends Command<string> {
  ctx: PlainLiteralObject;
  token: Token;
}

export interface JwtVerifyTokenQueryInterface extends Query<PlainLiteralObject> {
  ctx: PlainLiteralObject;
  token: string;
}

export interface JwtPortSettings {
  signAccessTokenCommand: Type<SignTokenCommandInterface>;
  signRefreshTokenCommand: Type<SignTokenCommandInterface>;
  verifyAccessTokenQuery: Type<JwtVerifyTokenQueryInterface>;
  verifyRefreshTokenQuery: Type<JwtVerifyTokenQueryInterface>;
}

@Injectable()
export class JwtPort {
  constructor(
    private readonly portSettings: JwtPortSettings,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async signAccessToken(
    ctx: PlainLiteralObject,
    token: Token,
  ): Promise<string> {
    return this.commandBus.execute(
      new this.portSettings.signAccessTokenCommand(ctx, token),
    );
  }

  async signRefreshToken(
    ctx: PlainLiteralObject,
    token: Token,
  ): Promise<string> {
    return this.commandBus.execute(
      new this.portSettings.signRefreshTokenCommand(ctx, token),
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
}

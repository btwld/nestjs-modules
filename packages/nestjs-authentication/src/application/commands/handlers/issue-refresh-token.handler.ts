import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';

import { AUTHENTICATION_JWT_PORT_TOKEN } from '../../../authentication.constants.js';
import { Token } from '../../../domain/aggregates/token.aggregate.js';
import { JwtPolicy } from '../../../domain/policies/jwt.policy.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { IssueRefreshTokenCommand } from '../impl/issue-refresh-token.command.js';

@CommandHandler(IssueRefreshTokenCommand)
export class IssueRefreshTokenHandler implements ICommandHandler<
  IssueRefreshTokenCommand,
  string
> {
  constructor(
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    private readonly jwtPort: JwtPort,
    @Inject(JwtPolicy)
    private readonly jwtPolicy: JwtPolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: IssueRefreshTokenCommand): Promise<string> {
    const { ctx, payload } = command;
    const now = new Date();

    const token = this.eventPublisher.mergeObjectContext(
      Token.create(createEventContext(ctx, {}, {}), {
        sub: payload.sub,
        type: 'refresh',
        iat: now,
        exp: this.jwtPolicy.getRefreshExpiry(now),
      }),
    );

    const signed = await this.jwtPort.signRefreshToken(ctx, token);
    token.commit();
    return signed;
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';

import { AUTHENTICATION_JWT_PORT_TOKEN } from '../../../authentication.constants.js';
import { Token } from '../../../domain/aggregates/token.aggregate.js';
import { JwtPolicy } from '../../../domain/policies/jwt.policy.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { IssueAccessTokenCommand } from '../impl/issue-access-token.command.js';

@CommandHandler(IssueAccessTokenCommand)
export class IssueAccessTokenHandler implements ICommandHandler<
  IssueAccessTokenCommand,
  string
> {
  constructor(
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    private readonly jwtPort: JwtPort,
    @Inject(JwtPolicy)
    private readonly jwtPolicy: JwtPolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: IssueAccessTokenCommand): Promise<string> {
    const { ctx, payload } = command;
    const now = new Date();

    const token = this.eventPublisher.mergeObjectContext(
      Token.create(createEventContext(ctx, {}, {}), {
        sub: payload.sub,
        type: 'access',
        iat: now,
        exp: this.jwtPolicy.getAccessExpiry(now),
      }),
    );

    const signed = await this.jwtPort.signAccessToken(ctx, token);
    token.commit();
    return signed;
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';

import { AUTHENTICATION_JWT_PORT_TOKEN } from '../../../authentication.constants.js';
import { Token } from '../../../domain/aggregates/token.aggregate.js';
import { AuthenticatedResponseInterface } from '../../../domain/interfaces/authenticated-response.interface.js';
import { JwtPolicy } from '../../../domain/policies/jwt.policy.js';
import { JwtPort } from '../../../domain/ports/jwt.port.js';
import { IssueAuthenticatedResponseCommand } from '../impl/issue-authenticated-response.command.js';

@CommandHandler(IssueAuthenticatedResponseCommand)
export class IssueAuthenticatedResponseHandler implements ICommandHandler<
  IssueAuthenticatedResponseCommand,
  AuthenticatedResponseInterface
> {
  constructor(
    @Inject(AUTHENTICATION_JWT_PORT_TOKEN)
    private readonly jwtPort: JwtPort,
    @Inject(JwtPolicy)
    private readonly jwtPolicy: JwtPolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: IssueAuthenticatedResponseCommand,
  ): Promise<AuthenticatedResponseInterface> {
    const { ctx, id } = command;
    const now = new Date();
    const eventContext = createEventContext(ctx, {}, {});

    const accessAgg = this.eventPublisher.mergeObjectContext(
      Token.create(eventContext, {
        sub: id,
        type: 'access',
        iat: now,
        exp: this.jwtPolicy.getAccessExpiry(now),
      }),
    );

    const refreshAgg = this.eventPublisher.mergeObjectContext(
      Token.create(eventContext, {
        sub: id,
        type: 'refresh',
        iat: now,
        exp: this.jwtPolicy.getRefreshExpiry(now),
      }),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtPort.signAccessToken(ctx, accessAgg),
      this.jwtPort.signRefreshToken(ctx, refreshAgg),
    ]);

    accessAgg.commit();
    refreshAgg.commit();

    return { accessToken, refreshToken };
  }
}

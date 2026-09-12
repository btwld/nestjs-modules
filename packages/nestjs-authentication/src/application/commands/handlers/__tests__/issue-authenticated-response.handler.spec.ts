import { randomUUID } from 'crypto';

import { mock } from 'vitest-mock-extended';

import { type EventPublisher } from '@nestjs/cqrs';

import { type Token } from '../../../../domain/aggregates/token.aggregate.js';
import { TokenIssuedEvent } from '../../../../domain/events/token-issued.event.js';
import { type AuthenticatedResponseInterface } from '../../../../domain/interfaces/authenticated-response.interface.js';
import { type JwtPolicy } from '../../../../domain/policies/jwt.policy.js';
import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import { IssueAuthenticatedResponseCommand } from '../../impl/issue-authenticated-response.command.js';
import { IssueAuthenticatedResponseHandler } from '../issue-authenticated-response.handler.js';

describe(IssueAuthenticatedResponseHandler.name, () => {
  const accessTokenStr = 'accessToken';
  const refreshTokenStr = 'refreshToken';
  const userId = randomUUID();
  const now = new Date();
  const accessExp = new Date(now.getTime() + 3600_000);
  const refreshExp = new Date(now.getTime() + 86_400_000);

  let handler: IssueAuthenticatedResponseHandler;
  let jwtPort: JwtPort;
  let jwtPolicy: JwtPolicy;
  let eventPublisher: EventPublisher;

  beforeEach(() => {
    jwtPort = mock<JwtPort>();
    jwtPolicy = mock<JwtPolicy>();
    eventPublisher = mock<EventPublisher>();

    void jwtPort.signAccessToken;
    vi.spyOn(jwtPort, 'signAccessToken').mockResolvedValue(accessTokenStr);
    void jwtPort.signRefreshToken;
    vi.spyOn(jwtPort, 'signRefreshToken').mockResolvedValue(refreshTokenStr);
    void jwtPolicy.getAccessExpiry;
    vi.spyOn(jwtPolicy, 'getAccessExpiry').mockReturnValue(accessExp);
    void jwtPolicy.getRefreshExpiry;
    vi.spyOn(jwtPolicy, 'getRefreshExpiry').mockReturnValue(refreshExp);
    void eventPublisher.mergeObjectContext;
    vi.spyOn(eventPublisher, 'mergeObjectContext').mockImplementation(
      (agg) => agg as Token,
    );

    handler = new IssueAuthenticatedResponseHandler(
      jwtPort,
      jwtPolicy,
      eventPublisher,
    );
  });

  it('should return response with accessToken and refreshToken', async () => {
    const command = new IssueAuthenticatedResponseCommand({}, userId);
    const result: AuthenticatedResponseInterface =
      await handler.execute(command);

    expect(result).toEqual({
      accessToken: accessTokenStr,
      refreshToken: refreshTokenStr,
    });
  });

  it('should sign access token with an access-type Token aggregate', async () => {
    const command = new IssueAuthenticatedResponseCommand({}, userId);
    await handler.execute(command);

    expect(jwtPort.signAccessToken).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ sub: userId, type: 'access' }),
    );
  });

  it('should sign refresh token with a refresh-type Token aggregate', async () => {
    const command = new IssueAuthenticatedResponseCommand({}, userId);
    await handler.execute(command);

    expect(jwtPort.signRefreshToken).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ sub: userId, type: 'refresh' }),
    );
  });

  it('should share one correlationId/causationId across access and refresh token events', async () => {
    // `mergeObjectContext` runs right after each `Token.create()`, before
    // the handler's own `commit()` clears the aggregate's uncommitted
    // events — capture the events here rather than after `execute` returns.
    const capturedEvents: TokenIssuedEvent[] = [];
    vi.spyOn(eventPublisher, 'mergeObjectContext').mockImplementation((agg) => {
      for (const event of agg.getUncommittedEvents()) {
        if (event instanceof TokenIssuedEvent) capturedEvents.push(event);
      }
      return agg as Token;
    });

    const command = new IssueAuthenticatedResponseCommand({}, userId);
    await handler.execute(command);

    const [accessEvent, refreshEvent] = capturedEvents;

    expect(refreshEvent.eventContext.getHeader('correlationId')).toBe(
      accessEvent.eventContext.getHeader('correlationId'),
    );
    expect(refreshEvent.eventContext.getHeader('causationId')).toBe(
      accessEvent.eventContext.getHeader('causationId'),
    );
  });
});

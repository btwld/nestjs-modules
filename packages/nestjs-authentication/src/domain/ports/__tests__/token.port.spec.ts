import { mock } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { Command, type CommandBus, Query, type QueryBus } from '@nestjs/cqrs';

import { type AuthorizationPayloadInterface } from '../../../domain/interfaces/authorization-payload.interface.js';
import {
  TokenPort,
  type TokenPortSettings,
  type IssueTokenCommandInterface,
  type ValidateTokenQueryInterface,
  type VerifyTokenQueryInterface,
} from '../token.port.js';

class MockIssueAccessTokenCommand
  extends Command<string>
  implements IssueTokenCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly payload: AuthorizationPayloadInterface,
  ) {
    super();
  }
}

class MockIssueRefreshTokenCommand
  extends Command<string>
  implements IssueTokenCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly payload: AuthorizationPayloadInterface,
  ) {
    super();
  }
}

class MockVerifyAccessTokenQuery
  extends Query<PlainLiteralObject>
  implements VerifyTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}

class MockVerifyRefreshTokenQuery
  extends Query<PlainLiteralObject>
  implements VerifyTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}

class MockValidateTokenQuery
  extends Query<boolean>
  implements ValidateTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly payload: PlainLiteralObject,
  ) {
    super();
  }
}

describe(TokenPort.name, () => {
  let port: TokenPort;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  const portSettings: TokenPortSettings = {
    issueAccessTokenCommand: MockIssueAccessTokenCommand,
    issueRefreshTokenCommand: MockIssueRefreshTokenCommand,
    verifyAccessTokenQuery: MockVerifyAccessTokenQuery,
    verifyRefreshTokenQuery: MockVerifyRefreshTokenQuery,
    validateTokenQuery: MockValidateTokenQuery,
  };

  beforeEach(() => {
    commandBus = mock<CommandBus>();
    queryBus = mock<QueryBus>();
    port = new TokenPort(portSettings, commandBus, queryBus);
  });

  describe('issueAccessToken', () => {
    it('should dispatch IssueAccessTokenCommand via commandBus', async () => {
      const expectedToken = 'access-token-123';
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(expectedToken);

      const result = await port.issueAccessToken({}, { sub: 'user-1' });

      expect(result).toBe(expectedToken);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { sub: 'user-1' } }),
      );
    });

    it('should create correct command type', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue('token');

      await port.issueAccessToken({}, { sub: 'user-1' });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockIssueAccessTokenCommand),
      );
    });
  });

  describe('issueRefreshToken', () => {
    it('should dispatch IssueRefreshTokenCommand via commandBus', async () => {
      const expectedToken = 'refresh-token-123';
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue(expectedToken);

      const result = await port.issueRefreshToken({}, { sub: 'user-1' });

      expect(result).toBe(expectedToken);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockIssueRefreshTokenCommand),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should dispatch VerifyAccessTokenQuery via queryBus', async () => {
      const decoded = { sub: 'user-1', iat: 123 };
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(decoded);

      const result = await port.verifyAccessToken({}, 'jwt-token');

      expect(result).toEqual(decoded);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'jwt-token' }),
      );
    });

    it('should create correct query type', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue({});

      await port.verifyAccessToken({}, 'jwt-token');

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockVerifyAccessTokenQuery),
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should dispatch VerifyRefreshTokenQuery via queryBus', async () => {
      const decoded = { sub: 'user-1', iat: 456 };
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(decoded);

      const result = await port.verifyRefreshToken({}, 'refresh-jwt');

      expect(result).toEqual(decoded);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockVerifyRefreshTokenQuery),
      );
    });
  });
});

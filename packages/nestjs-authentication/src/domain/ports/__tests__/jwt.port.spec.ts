import { mock } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { Command, type CommandBus, Query, type QueryBus } from '@nestjs/cqrs';

import { Token } from '../../../domain/aggregates/token.aggregate.js';
import {
  JwtPort,
  type JwtPortSettings,
  type JwtVerifyTokenQueryInterface,
  type SignTokenCommandInterface,
} from '../jwt.port.js';

const makeToken = (): Token =>
  new Token('test-jti', {
    sub: 'user-1',
    type: 'access',
    scope: [],
    iat: new Date(),
    exp: new Date(Date.now() + 3_600_000),
  });

class MockSignAccessTokenCommand
  extends Command<string>
  implements SignTokenCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: Token,
  ) {
    super();
  }
}

class MockSignRefreshTokenCommand
  extends Command<string>
  implements SignTokenCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: Token,
  ) {
    super();
  }
}

class MockVerifyAccessTokenQuery
  extends Query<PlainLiteralObject>
  implements JwtVerifyTokenQueryInterface
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
  implements JwtVerifyTokenQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly token: string,
  ) {
    super();
  }
}

describe(JwtPort.name, () => {
  let port: JwtPort;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  const portSettings: JwtPortSettings = {
    signAccessTokenCommand: MockSignAccessTokenCommand,
    signRefreshTokenCommand: MockSignRefreshTokenCommand,
    verifyAccessTokenQuery: MockVerifyAccessTokenQuery,
    verifyRefreshTokenQuery: MockVerifyRefreshTokenQuery,
  };

  beforeEach(() => {
    commandBus = mock<CommandBus>();
    queryBus = mock<QueryBus>();
    port = new JwtPort(portSettings, commandBus, queryBus);
  });

  describe('signAccessToken', () => {
    it('should dispatch SignAccessTokenCommand via commandBus', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue('signed-access-jwt');

      const result = await port.signAccessToken({}, makeToken());

      expect(result).toBe('signed-access-jwt');
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSignAccessTokenCommand),
      );
    });

    it('should forward token to command', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue('token');
      const token = makeToken();

      await port.signAccessToken({}, token);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ token }),
      );
    });
  });

  describe('signRefreshToken', () => {
    it('should dispatch SignRefreshTokenCommand via commandBus', async () => {
      void commandBus.execute;
      vi.spyOn(commandBus, 'execute').mockResolvedValue('signed-refresh-jwt');

      const result = await port.signRefreshToken({}, makeToken());

      expect(result).toBe('signed-refresh-jwt');
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSignRefreshTokenCommand),
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
        expect.any(MockVerifyAccessTokenQuery),
      );
    });

    it('should forward token string to query', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue({});

      await port.verifyAccessToken({}, 'my-jwt');

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'my-jwt' }),
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

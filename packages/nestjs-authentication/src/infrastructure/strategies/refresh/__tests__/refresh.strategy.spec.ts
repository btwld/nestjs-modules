import { randomUUID } from 'crypto';

import { mock } from 'vitest-mock-extended';

import { type AuthorizationPayloadInterface } from '../../../../domain/interfaces/authorization-payload.interface.js';
import { RefreshStrategyPolicy } from '../../../../domain/policies/refresh-strategy.policy.js';
import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { RefreshUnauthorizedException } from '../exceptions/refresh-unauthorized.exception.js';
import { RefreshStrategy } from '../refresh.strategy.js';

describe(RefreshStrategy, () => {
  const USERNAME = 'username';

  let user: NonNullable<AuthenticationUserResult>;
  let userPort: UserPort;
  let jwtPort: JwtPort;
  let refreshStrategy: RefreshStrategy;
  let authorizationPayloadInterface: AuthorizationPayloadInterface;

  beforeEach(async () => {
    userPort = mock<UserPort>();
    jwtPort = mock<JwtPort>();
    refreshStrategy = new RefreshStrategy(
      new RefreshStrategyPolicy({}),
      jwtPort,
      userPort,
    );

    user = {
      id: randomUUID(),
      email: 'test@example.com',
      username: 'test',
      active: true,
    };

    authorizationPayloadInterface = {
      sub: USERNAME,
    };

    void userPort.getBySubject;
    vi.spyOn(userPort, 'getBySubject').mockResolvedValue(user);
  });

  describe(RefreshStrategy.prototype.validate, () => {
    it('should return user', async () => {
      const result = await refreshStrategy.validate(
        authorizationPayloadInterface,
        {},
      );
      expect(result.id).toBe(user.id);
    });

    it(`should throw UnauthorizedException`, async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(null);

      const t = () =>
        refreshStrategy.validate(authorizationPayloadInterface, {});
      await expect(t).rejects.toThrow(RefreshUnauthorizedException);
    });
  });
});

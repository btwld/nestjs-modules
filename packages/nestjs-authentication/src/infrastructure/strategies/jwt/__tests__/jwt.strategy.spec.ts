import { randomUUID } from 'crypto';

import { mock } from 'vitest-mock-extended';

import { type AuthorizationPayloadInterface } from '../../../../domain/interfaces/authorization-payload.interface.js';
import { JwtStrategyPolicy } from '../../../../domain/policies/jwt-strategy.policy.js';
import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { JwtUnauthorizedException } from '../exceptions/jwt-unauthorized.exception.js';
import { JwtStrategy } from '../jwt.strategy.js';

describe(JwtStrategy, () => {
  let user: NonNullable<AuthenticationUserResult>;
  let jwtPort: JwtPort;
  let userPort: UserPort;
  let jwtStrategy: JwtStrategy;
  let authorizationPayload: AuthorizationPayloadInterface;

  beforeEach(async () => {
    jwtPort = mock<JwtPort>();
    userPort = mock<UserPort>();
    jwtStrategy = new JwtStrategy(new JwtStrategyPolicy({}), jwtPort, userPort);
    authorizationPayload = mock<AuthorizationPayloadInterface>();
    user = {
      id: randomUUID(),
      email: 'test@example.com',
      username: 'test',
      active: true,
    };
  });

  describe(JwtStrategy.prototype.validate, () => {
    it('should return user', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockImplementationOnce(async () => {
        return user;
      });
      const userResponse = await jwtStrategy.validate(authorizationPayload, {});
      expect(userResponse.id).toBe(user.id);
    });

    it('should throw error', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolve(null);
        });
      });
      const t = async () => {
        await jwtStrategy.validate(authorizationPayload, {});
      };
      await expect(t).rejects.toThrow(JwtUnauthorizedException);
    });
  });
});

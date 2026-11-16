import { mock } from 'vitest-mock-extended';

import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { AuthenticationAccessTokenException } from '../../../exceptions/authentication-access-token.exception.js';
import { AuthenticationUserPortRequiredException } from '../../../exceptions/authentication-user-port-required.exception.js';
import { ValidateAndVerifyAccessTokenQuery } from '../../impl/validate-and-verify-access-token.query.js';
import { ValidateAndVerifyAccessTokenHandler } from '../validate-and-verify-access-token.handler.js';

describe(ValidateAndVerifyAccessTokenHandler.name, () => {
  const token = 'access-token';
  const payload = { sub: 'user-1' };
  const user: NonNullable<AuthenticationUserResult> = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'user',
    active: true,
  };

  describe('with UserPort', () => {
    let jwtPort: JwtPort;
    let userPort: UserPort;
    let handler: ValidateAndVerifyAccessTokenHandler;

    beforeEach(() => {
      jwtPort = mock<JwtPort>();
      userPort = mock<UserPort>();
      void jwtPort.verifyAccessToken;
      vi.spyOn(jwtPort, 'verifyAccessToken').mockResolvedValue(payload);
      handler = new ValidateAndVerifyAccessTokenHandler(jwtPort, userPort);
    });

    it('should return payload when token is valid and user is found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(user);
      const query = new ValidateAndVerifyAccessTokenQuery({}, token);
      const result = await handler.execute(query);
      expect(result).toEqual(payload);
    });

    it.each([false, undefined, null])(
      'refuses a user whose active is %s like a missing one',
      async (active) => {
        const stored = { ...user };
        Reflect.set(stored, 'active', active);
        void userPort.getBySubject;
        vi.spyOn(userPort, 'getBySubject').mockResolvedValue(stored);
        const query = new ValidateAndVerifyAccessTokenQuery({}, token);

        await expect(handler.execute(query)).rejects.toThrow(
          AuthenticationAccessTokenException,
        );
      },
    );

    it('should throw AuthenticationAccessTokenException when user is not found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(null);
      const query = new ValidateAndVerifyAccessTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationAccessTokenException,
      );
    });

    it('should throw when JWT verify fails', async () => {
      void jwtPort.verifyAccessToken;
      vi.spyOn(jwtPort, 'verifyAccessToken').mockRejectedValue(
        new Error('invalid'),
      );
      const query = new ValidateAndVerifyAccessTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow();
    });
  });

  describe('without UserPort', () => {
    let jwtPort: JwtPort;
    let handler: ValidateAndVerifyAccessTokenHandler;

    beforeEach(() => {
      jwtPort = mock<JwtPort>();
      void jwtPort.verifyAccessToken;
      vi.spyOn(jwtPort, 'verifyAccessToken').mockResolvedValue(payload);
      handler = new ValidateAndVerifyAccessTokenHandler(jwtPort, null);
    });

    it('refuses to validate, rather than accepting every signed token', async () => {
      const query = new ValidateAndVerifyAccessTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationUserPortRequiredException,
      );
    });
  });
});

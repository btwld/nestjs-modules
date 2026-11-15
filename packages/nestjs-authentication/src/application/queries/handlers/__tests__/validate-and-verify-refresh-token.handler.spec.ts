import { mock } from 'vitest-mock-extended';

import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { AuthenticationRefreshTokenException } from '../../../exceptions/authentication-refresh-token.exception.js';
import { AuthenticationUserPortRequiredException } from '../../../exceptions/authentication-user-port-required.exception.js';
import { ValidateAndVerifyRefreshTokenQuery } from '../../impl/validate-and-verify-refresh-token.query.js';
import { ValidateAndVerifyRefreshTokenHandler } from '../validate-and-verify-refresh-token.handler.js';

describe(ValidateAndVerifyRefreshTokenHandler.name, () => {
  const token = 'refresh-token';
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
    let handler: ValidateAndVerifyRefreshTokenHandler;

    beforeEach(() => {
      jwtPort = mock<JwtPort>();
      userPort = mock<UserPort>();
      void jwtPort.verifyRefreshToken;
      vi.spyOn(jwtPort, 'verifyRefreshToken').mockResolvedValue(payload);
      handler = new ValidateAndVerifyRefreshTokenHandler(jwtPort, userPort);
    });

    it('should return payload when token is valid and user is found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(user);
      const query = new ValidateAndVerifyRefreshTokenQuery({}, token);
      const result = await handler.execute(query);
      expect(result).toEqual(payload);
    });

    it('refuses an inactive user like a missing one', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue({
        ...user,
        active: false,
      });
      const query = new ValidateAndVerifyRefreshTokenQuery({}, token);

      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationRefreshTokenException,
      );
    });

    it('should throw AuthenticationRefreshTokenException when user is not found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(null);
      const query = new ValidateAndVerifyRefreshTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationRefreshTokenException,
      );
    });

    it('should throw when JWT verify fails', async () => {
      void jwtPort.verifyRefreshToken;
      vi.spyOn(jwtPort, 'verifyRefreshToken').mockRejectedValue(
        new Error('invalid'),
      );
      const query = new ValidateAndVerifyRefreshTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow();
    });
  });

  describe('without UserPort', () => {
    let jwtPort: JwtPort;
    let handler: ValidateAndVerifyRefreshTokenHandler;

    beforeEach(() => {
      jwtPort = mock<JwtPort>();
      void jwtPort.verifyRefreshToken;
      vi.spyOn(jwtPort, 'verifyRefreshToken').mockResolvedValue(payload);
      handler = new ValidateAndVerifyRefreshTokenHandler(jwtPort, null);
    });

    it('refuses to validate, rather than accepting every signed token', async () => {
      const query = new ValidateAndVerifyRefreshTokenQuery({}, token);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationUserPortRequiredException,
      );
    });
  });
});

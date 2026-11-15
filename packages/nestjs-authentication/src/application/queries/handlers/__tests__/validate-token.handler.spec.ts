import { mock } from 'vitest-mock-extended';

import {
  type AuthenticationUserResult,
  type UserPort,
} from '../../../../domain/ports/user.port.js';
import { AuthenticationUserPortRequiredException } from '../../../exceptions/authentication-user-port-required.exception.js';
import { ValidateTokenQuery } from '../../impl/validate-token.query.js';
import { ValidateTokenHandler } from '../validate-token.handler.js';

describe(ValidateTokenHandler.name, () => {
  const payload = { sub: 'user-1' };
  const user: NonNullable<AuthenticationUserResult> = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'user',
    active: true,
  };

  describe('with UserPort', () => {
    let userPort: UserPort;
    let handler: ValidateTokenHandler;

    beforeEach(() => {
      userPort = mock<UserPort>();
      handler = new ValidateTokenHandler(userPort);
    });

    it('should return true when user is found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(user);
      const query = new ValidateTokenQuery({}, payload);
      const result = await handler.execute(query);
      expect(result).toBe(true);
    });

    it('returns false for an inactive user, as for a missing one', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue({
        ...user,
        active: false,
      });
      const query = new ValidateTokenQuery({}, payload);

      await expect(handler.execute(query)).resolves.toBe(false);
    });

    it('should return false when user is not found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(null);
      const query = new ValidateTokenQuery({}, payload);
      const result = await handler.execute(query);
      expect(result).toBe(false);
    });

    it('should return false when sub is not a string', async () => {
      const query = new ValidateTokenQuery({}, { sub: 123 });
      const result = await handler.execute(query);
      expect(result).toBe(false);
      expect(userPort.getBySubject).not.toHaveBeenCalled();
    });
  });

  describe('without UserPort', () => {
    it('refuses to validate, rather than accepting every signed token', async () => {
      const handler = new ValidateTokenHandler(null);
      const query = new ValidateTokenQuery({}, payload);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationUserPortRequiredException,
      );
    });
  });
});

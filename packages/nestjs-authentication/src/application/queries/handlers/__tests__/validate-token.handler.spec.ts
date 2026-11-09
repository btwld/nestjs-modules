import { mock } from 'vitest-mock-extended';

import { JwtStrategyPolicy } from '../../../../domain/policies/jwt-strategy.policy.js';
import { type UserPort } from '../../../../domain/ports/user.port.js';
import { AuthenticationUserPortRequiredException } from '../../../exceptions/authentication-user-port-required.exception.js';
import { ValidateTokenQuery } from '../../impl/validate-token.query.js';
import { ValidateTokenHandler } from '../validate-token.handler.js';

describe(ValidateTokenHandler.name, () => {
  const payload = { sub: 'user-1' };
  const user = { id: 'user-1' };

  describe('with UserPort', () => {
    let userPort: UserPort;
    let handler: ValidateTokenHandler;

    beforeEach(() => {
      userPort = mock<UserPort>();
      handler = new ValidateTokenHandler(new JwtStrategyPolicy({}), userPort);
    });

    it('should return true when user is found', async () => {
      void userPort.getBySubject;
      vi.spyOn(userPort, 'getBySubject').mockResolvedValue(user as never);
      const query = new ValidateTokenQuery({}, payload);
      const result = await handler.execute(query);
      expect(result).toBe(true);
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
    it('should return true (fail-open) when requireUserValidation is not set', async () => {
      const handler = new ValidateTokenHandler(new JwtStrategyPolicy({}), null);
      const query = new ValidateTokenQuery({}, payload);
      const result = await handler.execute(query);
      expect(result).toBe(true);
    });

    it('should return true (fail-open) when requireUserValidation is false', async () => {
      const handler = new ValidateTokenHandler(
        new JwtStrategyPolicy({ requireUserValidation: false }),
        null,
      );
      const query = new ValidateTokenQuery({}, payload);
      const result = await handler.execute(query);
      expect(result).toBe(true);
    });

    it('should throw AuthenticationUserPortRequiredException when requireUserValidation is true', async () => {
      const handler = new ValidateTokenHandler(
        new JwtStrategyPolicy({ requireUserValidation: true }),
        null,
      );
      const query = new ValidateTokenQuery({}, payload);
      await expect(handler.execute(query)).rejects.toThrow(
        AuthenticationUserPortRequiredException,
      );
    });
  });
});

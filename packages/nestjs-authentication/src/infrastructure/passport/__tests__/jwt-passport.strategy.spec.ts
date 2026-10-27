import { mock } from 'vitest-mock-extended';

import { NotAnErrorException } from '@concepta/nestjs-core';

import { type JwtPassportOptionsInterface } from '../interfaces/jwt-passport-options.interface.js';
import { JwtPassportStrategy } from '../jwt-passport.strategy.js';

describe(JwtPassportStrategy, () => {
  let jwtStrategyOptions: JwtPassportOptionsInterface;
  let verifyCallback: (...args: unknown[]) => void;
  let jwtStrategy: JwtPassportStrategy;

  beforeEach(async () => {
    jwtStrategyOptions = mock<JwtPassportOptionsInterface>({
      jwtFromRequest: () => 'rawToken',
      verifyToken: () => true,
    });
    verifyCallback = vi.fn();
    jwtStrategy = new JwtPassportStrategy(jwtStrategyOptions, verifyCallback);
  });

  describe(JwtPassportStrategy.prototype.authenticate, () => {
    const req = mock<Parameters<typeof jwtStrategy.authenticate>[0]>();
    it('should success', async () => {
      const userResponse = jwtStrategy.authenticate(req);
      expect(userResponse).toBe(true);
    });

    it('should throw when jwtFromRequest returns empty string', () => {
      void jwtStrategyOptions.jwtFromRequest;
      vi.spyOn(jwtStrategyOptions, 'jwtFromRequest').mockReturnValue('');
      expect(() => jwtStrategy.authenticate(req)).toThrow();
    });

    it('should throw when verifyToken throws a standard Error', () => {
      void jwtStrategyOptions.verifyToken;
      vi.spyOn(jwtStrategyOptions, 'verifyToken').mockImplementationOnce(() => {
        throw new Error();
      });
      expect(() => jwtStrategy.authenticate(req)).toThrow();
    });

    it('should throw when verifyToken throws a NotAnErrorException', () => {
      void jwtStrategyOptions.verifyToken;
      vi.spyOn(jwtStrategyOptions, 'verifyToken').mockImplementationOnce(() => {
        throw new NotAnErrorException(new Error());
      });
      expect(() => jwtStrategy.authenticate(req)).toThrow();
    });
  });
});

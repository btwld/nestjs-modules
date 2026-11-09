import { mock } from 'vitest-mock-extended';

import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import { createVerifyTokenCallback } from '../create-verify-token-callback.util.js';

describe('createVerifyTokenCallback', () => {
  const token = 'raw.jwt.token';
  const decoded = { sub: 'user-1' };

  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

  describe("when type is 'access'", () => {
    it('should verify via verifyAccessToken and invoke done with decoded token', async () => {
      const jwtPort = mock<JwtPort>();
      jwtPort.verifyAccessToken.mockResolvedValue(decoded);
      const done = vi.fn();

      createVerifyTokenCallback(jwtPort, 'access')(token, done);
      await flush();

      expect(jwtPort.verifyAccessToken).toHaveBeenCalledTimes(1);
      expect(jwtPort.verifyAccessToken).toHaveBeenCalledWith({}, token);
      expect(jwtPort.verifyRefreshToken).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(undefined, decoded);
    });

    it('should invoke done with the error when verify rejects', async () => {
      const jwtPort = mock<JwtPort>();
      const err = new Error('invalid signature');
      jwtPort.verifyAccessToken.mockRejectedValue(err);
      const done = vi.fn();

      createVerifyTokenCallback(jwtPort, 'access')(token, done);
      await flush();

      expect(done).toHaveBeenCalledWith(err);
    });
  });

  describe("when type is 'refresh'", () => {
    it('should verify via verifyRefreshToken and invoke done with decoded token', async () => {
      const jwtPort = mock<JwtPort>();
      jwtPort.verifyRefreshToken.mockResolvedValue(decoded);
      const done = vi.fn();

      createVerifyTokenCallback(jwtPort, 'refresh')(token, done);
      await flush();

      expect(jwtPort.verifyRefreshToken).toHaveBeenCalledTimes(1);
      expect(jwtPort.verifyRefreshToken).toHaveBeenCalledWith({}, token);
      expect(jwtPort.verifyAccessToken).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(undefined, decoded);
    });

    it('should invoke done with the error when verify rejects', async () => {
      const jwtPort = mock<JwtPort>();
      const err = new Error('expired');
      jwtPort.verifyRefreshToken.mockRejectedValue(err);
      const done = vi.fn();

      createVerifyTokenCallback(jwtPort, 'refresh')(token, done);
      await flush();

      expect(done).toHaveBeenCalledWith(err);
    });
  });

  it('should return a callback synchronously without throwing on rejection', () => {
    const jwtPort = mock<JwtPort>();
    jwtPort.verifyAccessToken.mockRejectedValue(new Error('boom'));
    const done = vi.fn();

    expect(() =>
      createVerifyTokenCallback(jwtPort, 'access')(token, done),
    ).not.toThrow();
  });
});

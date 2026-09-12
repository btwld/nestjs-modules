import { mock } from 'vitest-mock-extended';

import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import { VerifyRefreshTokenQuery } from '../../impl/verify-refresh-token.query.js';
import { VerifyRefreshTokenHandler } from '../verify-refresh-token.handler.js';

describe(VerifyRefreshTokenHandler.name, () => {
  const token = 'token';
  const decoded = { sub: 'user-1' };
  let jwtPort: JwtPort;
  let handler: VerifyRefreshTokenHandler;

  beforeEach(() => {
    jwtPort = mock<JwtPort>();
    void jwtPort.verifyRefreshToken;
    vi.spyOn(jwtPort, 'verifyRefreshToken').mockResolvedValue(decoded);
    handler = new VerifyRefreshTokenHandler(jwtPort);
  });

  it('should return decoded token', async () => {
    const query = new VerifyRefreshTokenQuery({}, token);
    const result = await handler.execute(query);
    expect(result).toEqual(decoded);
  });

  it('should throw error on verify failure', async () => {
    void jwtPort.verifyRefreshToken;
    vi.spyOn(jwtPort, 'verifyRefreshToken').mockRejectedValue(new Error());
    const query = new VerifyRefreshTokenQuery({}, token);
    await expect(handler.execute(query)).rejects.toThrow();
  });
});

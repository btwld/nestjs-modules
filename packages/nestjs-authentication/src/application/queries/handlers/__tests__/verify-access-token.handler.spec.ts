import { mock } from 'vitest-mock-extended';

import { type JwtPort } from '../../../../domain/ports/jwt.port.js';
import { VerifyAccessTokenQuery } from '../../impl/verify-access-token.query.js';
import { VerifyAccessTokenHandler } from '../verify-access-token.handler.js';

describe(VerifyAccessTokenHandler.name, () => {
  const token = 'token';
  const decoded = { sub: 'user-1' };
  let jwtPort: JwtPort;
  let handler: VerifyAccessTokenHandler;

  beforeEach(() => {
    jwtPort = mock<JwtPort>();
    void jwtPort.verifyAccessToken;
    vi.spyOn(jwtPort, 'verifyAccessToken').mockResolvedValue(decoded);
    handler = new VerifyAccessTokenHandler(jwtPort);
  });

  it('should return decoded token', async () => {
    const query = new VerifyAccessTokenQuery({}, token);
    const result = await handler.execute(query);
    expect(result).toEqual(decoded);
  });

  it('should throw error on verify failure', async () => {
    void jwtPort.verifyAccessToken;
    vi.spyOn(jwtPort, 'verifyAccessToken').mockRejectedValue(new Error());
    const query = new VerifyAccessTokenQuery({}, token);
    await expect(handler.execute(query)).rejects.toThrow();
  });
});

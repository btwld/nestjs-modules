import { mock } from 'vitest-mock-extended';

import { Token } from '../../../domain/aggregates/token.aggregate.js';
import { JwtPolicy } from '../../../domain/policies/jwt.policy.js';
import { type NestJwtService } from '../jwt.externals.js';
import { JwtService } from '../jwt.service.js';

describe(JwtService, () => {
  const signedToken = 'signed-token';
  const decoded = { sub: 'user-1' };

  const iat = new Date('2025-01-01T00:00:00.000Z');
  const exp = new Date('2025-01-01T01:00:00.000Z');

  const accessToken = new Token('test-jti-access', {
    sub: 'user-1',
    type: 'access',
    scope: [],
    iat,
    exp,
  });

  const refreshToken = new Token('test-jti-refresh', {
    sub: 'user-1',
    type: 'refresh',
    scope: ['offline_access'],
    iat,
    exp,
  });

  let jwtService: JwtService;
  let nestJwtService: NestJwtService;
  let tokenPolicy: JwtPolicy;

  beforeEach(() => {
    nestJwtService = mock<NestJwtService>();
    tokenPolicy = new JwtPolicy({
      access: { secret: 'access-secret', signOptions: { expiresIn: '1h' } },
      refresh: { secret: 'refresh-secret', signOptions: { expiresIn: '7d' } },
    });
    jwtService = new JwtService(tokenPolicy, nestJwtService);
  });

  describe(JwtService.prototype.signAccessToken, () => {
    it('should sign with JWT claims from token', async () => {
      void nestJwtService.signAsync;
      vi.spyOn(nestJwtService, 'signAsync').mockResolvedValue(signedToken);

      const result = await jwtService.signAccessToken(accessToken);

      expect(result).toBe(signedToken);
      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        {
          jti: 'test-jti-access',
          sub: 'user-1',
          iat: Math.floor(iat.getTime() / 1000),
          exp: Math.floor(exp.getTime() / 1000),
        },
        { secret: 'access-secret' },
      );
    });

    it('should include scope claim when scopes are present', async () => {
      void nestJwtService.signAsync;
      vi.spyOn(nestJwtService, 'signAsync').mockResolvedValue(signedToken);

      await jwtService.signRefreshToken(refreshToken);

      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'offline_access' }),
        expect.anything(),
      );
    });

    it('should throw when signAsync rejects', async () => {
      void nestJwtService.signAsync;
      vi.spyOn(nestJwtService, 'signAsync').mockRejectedValue(new Error());
      await expect(jwtService.signAccessToken(accessToken)).rejects.toThrow();
    });
  });

  describe(JwtService.prototype.signRefreshToken, () => {
    it('should sign with refresh options (secret, no expiresIn)', async () => {
      void nestJwtService.signAsync;
      vi.spyOn(nestJwtService, 'signAsync').mockResolvedValue(signedToken);

      const result = await jwtService.signRefreshToken(refreshToken);

      expect(result).toBe(signedToken);
      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', scope: 'offline_access' }),
        { secret: 'refresh-secret' },
      );
    });
  });

  describe(JwtService.prototype.verifyAccessToken, () => {
    it('should verify with access options', async () => {
      void nestJwtService.verifyAsync;
      vi.spyOn(nestJwtService, 'verifyAsync').mockResolvedValue(decoded);
      const result = await jwtService.verifyAccessToken(signedToken);
      expect(result).toEqual(decoded);
      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith(signedToken, {
        secret: 'access-secret',
      });
    });

    it('should throw when verifyAsync rejects', async () => {
      void nestJwtService.verifyAsync;
      vi.spyOn(nestJwtService, 'verifyAsync').mockRejectedValue(new Error());
      await expect(jwtService.verifyAccessToken(signedToken)).rejects.toThrow();
    });
  });

  describe(JwtService.prototype.verifyRefreshToken, () => {
    it('should verify with refresh options', async () => {
      void nestJwtService.verifyAsync;
      vi.spyOn(nestJwtService, 'verifyAsync').mockResolvedValue(decoded);
      const result = await jwtService.verifyRefreshToken(signedToken);
      expect(result).toEqual(decoded);
      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith(signedToken, {
        secret: 'refresh-secret',
      });
    });
  });

  describe('asymmetric key support (RS256)', () => {
    const privateKey = 'test-private-key';
    const publicKey = 'test-public-key';

    let asymmetricJwtService: JwtService;
    let asymmetricNestJwtService: NestJwtService;

    beforeEach(() => {
      asymmetricNestJwtService = mock<NestJwtService>();
      const asymmetricPolicy = new JwtPolicy({
        access: {
          privateKey,
          publicKey,
          signOptions: { algorithm: 'RS256', expiresIn: '1h' },
        },
        refresh: {
          privateKey,
          publicKey,
          signOptions: { algorithm: 'RS256', expiresIn: '7d' },
        },
      });
      asymmetricJwtService = new JwtService(
        asymmetricPolicy,
        asymmetricNestJwtService,
      );
    });

    it('should pass privateKey through on signAccessToken', async () => {
      void asymmetricNestJwtService.signAsync;
      vi.spyOn(asymmetricNestJwtService, 'signAsync').mockResolvedValue(
        signedToken,
      );

      await asymmetricJwtService.signAccessToken(accessToken);

      expect(asymmetricNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1' }),
        expect.objectContaining({
          algorithm: 'RS256',
          privateKey,
          secret: undefined,
        }),
      );
    });

    it('should pass privateKey through on signRefreshToken', async () => {
      void asymmetricNestJwtService.signAsync;
      vi.spyOn(asymmetricNestJwtService, 'signAsync').mockResolvedValue(
        signedToken,
      );

      await asymmetricJwtService.signRefreshToken(refreshToken);

      expect(asymmetricNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1' }),
        expect.objectContaining({
          algorithm: 'RS256',
          privateKey,
          secret: undefined,
        }),
      );
    });

    it('should pass publicKey through on verifyAccessToken', async () => {
      void asymmetricNestJwtService.verifyAsync;
      vi.spyOn(asymmetricNestJwtService, 'verifyAsync').mockResolvedValue(
        decoded,
      );

      await asymmetricJwtService.verifyAccessToken(signedToken);

      expect(asymmetricNestJwtService.verifyAsync).toHaveBeenCalledWith(
        signedToken,
        expect.objectContaining({ publicKey, secret: undefined }),
      );
    });

    it('should pass publicKey through on verifyRefreshToken', async () => {
      void asymmetricNestJwtService.verifyAsync;
      vi.spyOn(asymmetricNestJwtService, 'verifyAsync').mockResolvedValue(
        decoded,
      );

      await asymmetricJwtService.verifyRefreshToken(signedToken);

      expect(asymmetricNestJwtService.verifyAsync).toHaveBeenCalledWith(
        signedToken,
        expect.objectContaining({ publicKey, secret: undefined }),
      );
    });
  });

  describe('JwtPolicy#getAccessExpiry / getRefreshExpiry', () => {
    it('should compute access expiry from policy expiresIn', () => {
      const from = new Date('2025-06-01T00:00:00.000Z');
      const result = tokenPolicy.getAccessExpiry(from);
      expect(result.getTime()).toBe(from.getTime() + 3_600_000);
    });

    it('should compute refresh expiry from policy expiresIn', () => {
      const from = new Date('2025-06-01T00:00:00.000Z');
      const result = tokenPolicy.getRefreshExpiry(from);
      expect(result.getTime()).toBe(from.getTime() + 7 * 86_400_000);
    });
  });
});

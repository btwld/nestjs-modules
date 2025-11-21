import { mock } from 'jest-mock-extended';

import { JwtVerifyTokenService } from './jwt-verify-token.service';
import { JwtService } from './jwt.service';

describe(JwtVerifyTokenService, () => {
  let jwtService: JwtService;
  let jwtVerifyTokenService: JwtVerifyTokenService;
  const token = 'token';

  beforeEach(() => {
    jwtService = mock<JwtService>();
    jwtVerifyTokenService = new JwtVerifyTokenService(jwtService, jwtService);
  });

  describe(JwtVerifyTokenService.prototype.accessToken, () => {
    it('should success', async () => {
      const spyAccessToken = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ foo: 'bar' });
      const result = await jwtVerifyTokenService.accessToken('{"foo": "bar"}');
      expect(result).toEqual({ foo: 'bar' });
      expect(spyAccessToken).toHaveBeenCalledWith('{"foo": "bar"}');
    });

    it('should throw error', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockImplementationOnce(() => {
        throw new Error();
      });
      const t = async () => await jwtVerifyTokenService.accessToken(token);
      await expect(t).rejects.toThrow();
    });
  });

  describe(JwtVerifyTokenService.prototype.refreshToken, () => {
    it('should success', async () => {
      const spyRefreshToken = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ man: 'chu' });
      const result = await jwtVerifyTokenService.refreshToken('{"man": "chu"}');
      expect(result).toEqual({ man: 'chu' });
      expect(spyRefreshToken).toHaveBeenCalledWith('{"man": "chu"}');
    });

    it('should throw error', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockImplementationOnce(() => {
        throw new Error();
      });
      const t = async () => await jwtVerifyTokenService.refreshToken(token);
      await expect(t).rejects.toThrow();
    });
  });
});

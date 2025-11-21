import { JwtService } from './jwt.service';

describe(JwtService, () => {
  const token = 'token';

  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({});
  });

  describe(JwtService.prototype.signAsync, () => {
    it('should success', async () => {
      const spySignAsync = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(token);
      const result = await jwtService.signAsync(token);
      expect(result).toBe(token);
      expect(spySignAsync).toHaveBeenCalledWith(token);
    });

    it('should throw error', async () => {
      jest.spyOn(jwtService, 'signAsync').mockImplementationOnce(() => {
        throw new Error();
      });
      const t = async () => await jwtService.signAsync(token);
      await expect(t).rejects.toThrow();
    });
  });

  describe(JwtService.prototype.verifyAsync, () => {
    it('should success', async () => {
      const spyVerifyAsync = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ token });
      const result = await jwtService.verifyAsync(token);
      expect(result.token).toBe(token);
      expect(spyVerifyAsync).toHaveBeenCalledWith(token);
    });

    it('should throw error', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockImplementationOnce(() => {
        throw new Error();
      });
      const t = async () => await jwtService.verifyAsync(token);
      await expect(t).rejects.toThrow();
    });
  });

  describe(JwtService.prototype.decode, () => {
    it('should success', async () => {
      const spyDecode = jest.spyOn(jwtService, 'decode');
      await jwtService.decode(token);
      expect(spyDecode).toHaveBeenCalledWith(token);
    });

    it('should throw error', async () => {
      jest.spyOn(jwtService, 'decode').mockImplementationOnce(() => {
        throw new Error();
      });
      const t = async () => await jwtService.decode(token);
      await expect(t).rejects.toThrow();
    });
  });
});

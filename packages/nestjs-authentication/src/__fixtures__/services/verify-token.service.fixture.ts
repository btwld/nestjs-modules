import { JwtVerifyOptions } from '@nestjs/jwt';

import { VerifyTokenServiceInterface } from '../../interfaces/verify-token-service.interface';

export class VerifyTokenServiceFixture implements VerifyTokenServiceInterface {
  public discriminator = 'default';

  async accessToken(
    _token: string,
    _options?: JwtVerifyOptions,
  ): Promise<object> {
    throw new Error('Method not implemented.');
  }

  async refreshToken(
    _token: string,
    _options?: JwtVerifyOptions,
  ): Promise<object> {
    throw new Error('Method not implemented.');
  }
}

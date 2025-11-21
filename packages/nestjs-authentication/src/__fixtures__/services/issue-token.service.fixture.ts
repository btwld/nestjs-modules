import { JwtSignOptions } from '@nestjs/jwt';

import { AuthenticationResponseInterface } from '@concepta/nestjs-common';

import { IssueTokenServiceInterface } from '../../interfaces/issue-token-service.interface';

export class IssueTokenServiceFixture implements IssueTokenServiceInterface {
  public discriminator = 'default';

  responsePayload(_id: string): Promise<AuthenticationResponseInterface> {
    throw new Error('Method not implemented.');
  }
  accessToken(
    _payload: string | object | Buffer,
    _options?: JwtSignOptions,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }
  refreshToken(
    _payload: string | object | Buffer,
    _options?: JwtSignOptions,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }
}

import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';

import { Token } from '../../domain/aggregates/token.aggregate.js';
import { JwtPolicy } from '../../domain/policies/jwt.policy.js';

import { NestJwtService } from './jwt.externals.js';

@Injectable()
export class JwtService {
  constructor(
    @Inject(JwtPolicy)
    private readonly tokenPolicy: JwtPolicy,
    private readonly nestJwtService: NestJwtService,
  ) {}

  async signAccessToken(token: Token): Promise<string> {
    const { signOptions, secret, privateKey } = this.tokenPolicy.access;
    // strip expiresIn — exp is set explicitly in claims; both together is a
    // runtime error in jsonwebtoken ("expiresIn and exp are mutually exclusive")
    const { expiresIn: _expiresIn, ...opts } = signOptions ?? {};
    return this.nestJwtService.signAsync(this.toClaims(token), {
      ...opts,
      secret,
      privateKey,
    });
  }

  async signRefreshToken(token: Token): Promise<string> {
    const { signOptions, secret, privateKey } = this.tokenPolicy.refresh;
    const { expiresIn: _expiresIn, ...opts } = signOptions ?? {};
    return this.nestJwtService.signAsync(this.toClaims(token), {
      ...opts,
      secret,
      privateKey,
    });
  }

  async verifyAccessToken(token: string): Promise<PlainLiteralObject> {
    const { verifyOptions, secret, publicKey } = this.tokenPolicy.access;
    return this.nestJwtService.verifyAsync<PlainLiteralObject>(token, {
      ...verifyOptions,
      secret,
      publicKey,
    });
  }

  async verifyRefreshToken(token: string): Promise<PlainLiteralObject> {
    const { verifyOptions, secret, publicKey } = this.tokenPolicy.refresh;
    return this.nestJwtService.verifyAsync<PlainLiteralObject>(token, {
      ...verifyOptions,
      secret,
      publicKey,
    });
  }

  private toClaims(token: Token): PlainLiteralObject {
    return {
      jti: token.id,
      sub: token.sub,
      iat: Math.floor(token.iat.getTime() / 1000),
      exp: Math.floor(token.exp.getTime() / 1000),
      ...(token.scope.length > 0 ? { scope: token.scope.join(' ') } : {}),
    };
  }
}

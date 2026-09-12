import { type Strategy } from 'passport-jwt';
import { Strategy as PassportStrategy } from 'passport-strategy';

import { HttpStatus } from '@nestjs/common';

import { NotAnErrorException } from '@concepta/nestjs-core';

import { JwtVerifyException } from '../jwt/exceptions/jwt-verify.exception.js';

import { type JwtPassportOptionsInterface } from './interfaces/jwt-passport-options.interface.js';

export class JwtPassportStrategy extends PassportStrategy {
  constructor(
    private options: JwtPassportOptionsInterface,
    private verify: (...args: unknown[]) => void,
  ) {
    super();
  }

  authenticate(...args: Parameters<Strategy['authenticate']>) {
    const [req] = args;

    const rawToken = this.options.jwtFromRequest(req);

    if (!rawToken) {
      return this.fail('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }

    try {
      return this.options.verifyToken(
        rawToken,
        (e?: Error, decodedToken?: unknown) =>
          this.verifyTokenCallback(req, e, decodedToken),
      );
    } catch (e) {
      const exception = new JwtVerifyException({
        originalError: e,
      });
      return this.error(exception);
    }
  }

  private verifyTokenCallback(req: unknown, e?: Error, decodedToken?: unknown) {
    if (e) {
      return this.error(e);
    }

    try {
      return this.verify(decodedToken, req, this.isVerifiedCallback.bind(this));
    } catch (e) {
      const exception = e instanceof Error ? e : new NotAnErrorException(e);
      return this.error(exception);
    }
  }

  private isVerifiedCallback(
    error: Error | null,
    user: unknown,
    info: unknown,
  ) {
    if (error) {
      return this.error(error);
    } else if (!user) {
      return this.fail(info, HttpStatus.UNAUTHORIZED);
    } else {
      return this.success(user, info);
    }
  }
}

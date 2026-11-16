import { HttpStatus } from '@nestjs/common';

import { type RuntimeExceptionOptions } from '@concepta/nestjs-core';

import { JwtException } from './jwt.exception.js';

/**
 * Generic exception.
 */
export class JwtVerifyException extends JwtException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      safeMessage: 'Error on JWT verification',
      httpStatus: HttpStatus.UNAUTHORIZED,
      fault: 'client',
      ...options,
    });
    this.errorCode = 'JWT_VERIFY_ERROR';
  }
}

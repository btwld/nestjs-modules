import { HttpStatus, type ContextType } from '@nestjs/common';

import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

import { AuthenticationException } from '../../domain/exceptions/authentication.exception.js';

/**
 * Thrown when a guard built with `AuthGuard()` is asked to authenticate a
 * call that is not HTTP, such as a message handler in a microservice that
 * inherits the app's config: it reads the HTTP request only, and what any
 * other call carries is the caller's own payload. A guard that can be
 * turned off lets an `@AuthPublic()` handler through instead; to
 * authenticate another transport, override the guard's `getRequest`.
 */
export class AuthTransportUnsupportedException extends AuthenticationException {
  declare context: RuntimeException['context'] & { transport: ContextType };

  constructor(
    transport: ContextType,
    options?: Omit<RuntimeExceptionOptions, 'httpStatus'>,
  ) {
    super({
      message: 'Cannot authenticate a %s call: only HTTP calls are supported',
      messageParams: [transport],
      safeMessage: 'This call cannot be authenticated.',
      fault: 'usage',
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });

    this.errorCode = 'AUTH_TRANSPORT_UNSUPPORTED_ERROR';
    this.context = { ...this.context, transport };
  }
}

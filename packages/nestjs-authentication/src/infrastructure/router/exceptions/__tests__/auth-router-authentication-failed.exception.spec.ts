import { HttpStatus } from '@nestjs/common';

import { AuthRouterAuthenticationFailedException } from '../auth-router-authentication-failed.exception.js';
import { AuthRouterException } from '../auth-router.exception.js';

describe(AuthRouterAuthenticationFailedException.name, () => {
  it('should be an instance of AuthRouterException', () => {
    const exception = new AuthRouterAuthenticationFailedException(
      'google',
      'bad credentials',
    );
    expect(exception).toBeInstanceOf(AuthRouterException);
  });

  it('should have httpStatus UNAUTHORIZED by default', () => {
    const exception = new AuthRouterAuthenticationFailedException(
      'google',
      'bad credentials',
    );
    expect(exception.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should have fault client by default', () => {
    const exception = new AuthRouterAuthenticationFailedException(
      'google',
      'bad credentials',
    );
    expect(exception.fault).toBe('client');
  });

  it('should allow options to override httpStatus and fault', () => {
    const exception = new AuthRouterAuthenticationFailedException(
      'google',
      'provider outage',
      { httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, fault: 'internal' },
    );
    expect(exception.httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.fault).toBe('internal');
  });

  it('should have errorCode AUTH_ROUTER_AUTHENTICATION_FAILED_ERROR', () => {
    const exception = new AuthRouterAuthenticationFailedException(
      'google',
      'bad credentials',
    );
    expect(exception.errorCode).toBe('AUTH_ROUTER_AUTHENTICATION_FAILED_ERROR');
  });
});

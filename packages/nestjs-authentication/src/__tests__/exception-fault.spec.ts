import { fileURLToPath } from 'url';

import {
  RuntimeException,
  type RuntimeExceptionFault,
} from '@concepta/nestjs-core';
import { collectRuntimeExceptionClassNames } from '@concepta/nestjs-core/testing';

import { AuthenticationAccessTokenException } from '../application/exceptions/authentication-access-token.exception.js';
import { AuthenticationRefreshTokenException } from '../application/exceptions/authentication-refresh-token.exception.js';
import { AuthenticationUserPortRequiredException } from '../application/exceptions/authentication-user-port-required.exception.js';
import { LocalInvalidPasswordException } from '../application/exceptions/local-invalid-password.exception.js';
import { LocalUserInactiveException } from '../application/exceptions/local-user-inactive.exception.js';
import { LocalUsernameNotFoundException } from '../application/exceptions/local-username-not-found.exception.js';
import { VerifyOtpInvalidException } from '../application/exceptions/verify-otp-invalid.exception.js';
import { AuthenticationEmailException } from '../domain/exceptions/authentication-email.exception.js';
import { AuthenticationException } from '../domain/exceptions/authentication.exception.js';
import { TokenAlreadyRevokedException } from '../domain/exceptions/token-already-revoked.exception.js';
import { TokenException } from '../domain/exceptions/token.exception.js';
import { AuthTransportUnsupportedException } from '../infrastructure/exceptions/auth-transport-unsupported.exception.js';
import { AuthUserConflictException } from '../infrastructure/exceptions/auth-user-conflict.exception.js';
import { AuthenticationFeatureConfigException } from '../infrastructure/exceptions/authentication-feature-config.exception.js';
import { JwtVerifyException } from '../infrastructure/jwt/exceptions/jwt-verify.exception.js';
import { JwtException } from '../infrastructure/jwt/exceptions/jwt.exception.js';
import { RecoveryOtpInvalidException } from '../infrastructure/mfa/recovery/exceptions/recovery-otp-invalid.exception.js';
import { RecoveryException } from '../infrastructure/mfa/recovery/exceptions/recovery.exception.js';
import { VerifyException } from '../infrastructure/mfa/verify/exceptions/verify.exception.js';
import { AuthRouterAuthenticationFailedException } from '../infrastructure/router/exceptions/auth-router-authentication-failed.exception.js';
import { AuthRouterConfigNotAvailableException } from '../infrastructure/router/exceptions/auth-router-config-not-available.exception.js';
import { AuthRouterGuardInvalidException } from '../infrastructure/router/exceptions/auth-router-guard-invalid.exception.js';
import { AuthRouterProviderMissingException } from '../infrastructure/router/exceptions/auth-router-provider-missing.exception.js';
import { AuthRouterProviderNotSupportedException } from '../infrastructure/router/exceptions/auth-router-provider-not-supported.exception.js';
import { AuthRouterException } from '../infrastructure/router/exceptions/auth-router.exception.js';
import { JwtAuthenticationException } from '../infrastructure/strategies/jwt/exceptions/jwt-authentication.exception.js';
import { JwtUnauthorizedException } from '../infrastructure/strategies/jwt/exceptions/jwt-unauthorized.exception.js';
import { LocalInvalidCredentialsException } from '../infrastructure/strategies/local/exceptions/local-invalid-credentials.exception.js';
import { LocalInvalidLoginDataException } from '../infrastructure/strategies/local/exceptions/local-invalid-login-data.exception.js';
import { LocalUnauthorizedException } from '../infrastructure/strategies/local/exceptions/local-unauthorized.exception.js';
import { LocalException } from '../infrastructure/strategies/local/exceptions/local.exception.js';
import { RefreshUnauthorizedException } from '../infrastructure/strategies/refresh/exceptions/refresh-unauthorized.exception.js';
import { RefreshException } from '../infrastructure/strategies/refresh/exceptions/refresh.exception.js';

/**
 * Anti-drift check: every `RuntimeException` subclass in this package states
 * an expected `fault` here. Does not cover the `fault` override at the
 * `LocalException` call site in `local.strategy.ts` (schema-not-configured)
 * — the second `LocalException` call site there relies on the class
 * default. Those are call-site, not class-level, classifications.
 */
const CASES: {
  name: string;
  build: () => RuntimeException;
  fault: RuntimeExceptionFault;
  errorCode: string;
}[] = [
  {
    name: 'AuthenticationAccessTokenException',
    errorCode: 'AUTHENTICATION_ACCESS_TOKEN_ERROR',
    build: () => new AuthenticationAccessTokenException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationRefreshTokenException',
    errorCode: 'AUTHENTICATION_REFRESH_TOKEN_ERROR',
    build: () => new AuthenticationRefreshTokenException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationUserPortRequiredException',
    errorCode: 'AUTHENTICATION_USER_PORT_REQUIRED_ERROR',
    build: () => new AuthenticationUserPortRequiredException(),
    fault: 'usage',
  },
  {
    name: 'LocalInvalidPasswordException',
    errorCode: 'AUTH_LOCAL_INVALID_PASSWORD_ERROR',
    build: () => new LocalInvalidPasswordException('someUser'),
    fault: 'client',
  },
  {
    name: 'LocalUserInactiveException',
    errorCode: 'AUTH_LOCAL_USER_INACTIVE_ERROR',
    build: () => new LocalUserInactiveException('someUser'),
    fault: 'client',
  },
  {
    name: 'LocalUsernameNotFoundException',
    errorCode: 'AUTH_LOCAL_USERNAME_NOT_FOUND_ERROR',
    build: () => new LocalUsernameNotFoundException('someUser'),
    fault: 'client',
  },
  {
    name: 'VerifyOtpInvalidException',
    errorCode: 'AUTH_VERIFY_OTP_INVALID_ERROR',
    build: () => new VerifyOtpInvalidException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationEmailException',
    errorCode: 'AUTHENTICATION_EMAIL_ERROR',
    build: () => new AuthenticationEmailException(),
    fault: 'internal',
  },
  {
    name: 'AuthenticationException (default)',
    errorCode: 'AUTHENTICATION_ERROR',
    build: () => new AuthenticationException(),
    fault: 'internal',
  },
  {
    name: 'TokenAlreadyRevokedException',
    errorCode: 'TOKEN_ALREADY_REVOKED_ERROR',
    build: () => new TokenAlreadyRevokedException('token-id'),
    fault: 'client',
  },
  {
    name: 'TokenException (default)',
    errorCode: 'TOKEN_ERROR',
    build: () => new TokenException(),
    fault: 'internal',
  },
  {
    name: 'AuthenticationFeatureConfigException',
    errorCode: 'AUTHENTICATION_FEATURE_CONFIG_ERROR',
    build: () =>
      new AuthenticationFeatureConfigException('someFeature', ['somePort']),
    fault: 'usage',
  },
  {
    name: 'JwtVerifyException',
    errorCode: 'JWT_VERIFY_ERROR',
    build: () => new JwtVerifyException(),
    fault: 'client',
  },
  {
    name: 'JwtException (default)',
    errorCode: 'JWT_ERROR',
    build: () => new JwtException(),
    fault: 'internal',
  },
  {
    name: 'RecoveryOtpInvalidException',
    errorCode: 'AUTH_RECOVERY_OTP_INVALID_ERROR',
    build: () => new RecoveryOtpInvalidException(),
    fault: 'client',
  },
  {
    name: 'RecoveryException (default)',
    errorCode: 'AUTH_RECOVERY_ERROR',
    build: () => new RecoveryException(),
    fault: 'internal',
  },
  {
    name: 'VerifyException (default)',
    errorCode: 'AUTH_VERIFY_ERROR',
    build: () => new VerifyException(),
    fault: 'internal',
  },
  {
    name: 'AuthRouterAuthenticationFailedException',
    errorCode: 'AUTH_ROUTER_AUTHENTICATION_FAILED_ERROR',
    build: () =>
      new AuthRouterAuthenticationFailedException('someProvider', 'reason'),
    fault: 'client',
  },
  {
    name: 'AuthRouterConfigNotAvailableException',
    errorCode: 'AUTH_ROUTER_CONFIG_NOT_AVAILABLE_ERROR',
    build: () => new AuthRouterConfigNotAvailableException(),
    fault: 'usage',
  },
  {
    name: 'AuthRouterGuardInvalidException',
    errorCode: 'AUTH_ROUTER_GUARD_INVALID_ERROR',
    build: () => new AuthRouterGuardInvalidException('someProvider'),
    fault: 'usage',
  },
  {
    name: 'AuthRouterProviderMissingException',
    errorCode: 'AUTH_ROUTER_PROVIDER_MISSING_ERROR',
    build: () => new AuthRouterProviderMissingException(),
    fault: 'client',
  },
  {
    name: 'AuthRouterProviderNotSupportedException',
    errorCode: 'AUTH_ROUTER_PROVIDER_NOT_SUPPORTED_ERROR',
    build: () => new AuthRouterProviderNotSupportedException('someProvider'),
    fault: 'client',
  },
  {
    name: 'AuthRouterException (default)',
    errorCode: 'AUTH_ROUTER_ERROR',
    build: () => new AuthRouterException(),
    fault: 'internal',
  },
  {
    name: 'JwtAuthenticationException (default)',
    errorCode: 'AUTH_JWT_ERROR',
    build: () => new JwtAuthenticationException(),
    fault: 'internal',
  },
  {
    name: 'JwtUnauthorizedException',
    errorCode: 'AUTH_JWT_UNAUTHORIZED_ERROR',
    build: () => new JwtUnauthorizedException(),
    fault: 'client',
  },
  {
    name: 'AuthUserConflictException',
    errorCode: 'AUTH_USER_CONFLICT_ERROR',
    build: () => new AuthUserConflictException(),
    fault: 'client',
  },
  {
    name: 'AuthTransportUnsupportedException',
    errorCode: 'AUTH_TRANSPORT_UNSUPPORTED_ERROR',
    build: () => new AuthTransportUnsupportedException('rpc'),
    fault: 'usage',
  },
  {
    name: 'LocalInvalidCredentialsException',
    errorCode: 'AUTH_LOCAL_INVALID_CREDENTIALS_ERROR',
    build: () => new LocalInvalidCredentialsException(),
    fault: 'client',
  },
  {
    name: 'LocalInvalidLoginDataException',
    errorCode: 'AUTH_LOCAL_INVALID_LOGIN_DATA_ERROR',
    build: () => new LocalInvalidLoginDataException(),
    fault: 'client',
  },
  {
    name: 'LocalUnauthorizedException (default)',
    errorCode: 'AUTH_LOCAL_UNAUTHORIZED_ERROR',
    build: () => new LocalUnauthorizedException(),
    fault: 'internal',
  },
  {
    name: 'LocalException (default)',
    errorCode: 'AUTH_LOCAL_ERROR',
    build: () => new LocalException(),
    fault: 'internal',
  },
  {
    name: 'RefreshUnauthorizedException',
    errorCode: 'AUTH_REFRESH_NOT_AUTHORIZED_ERROR',
    build: () => new RefreshUnauthorizedException(),
    fault: 'client',
  },
  {
    name: 'RefreshException (default)',
    errorCode: 'AUTH_REFRESH_ERROR',
    build: () => new RefreshException(),
    fault: 'internal',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
  });

  it.each(CASES)('$name has errorCode=$errorCode', ({ build, errorCode }) => {
    expect(build().errorCode).toEqual(errorCode);
  });

  it('every RuntimeException subclass in this package is listed above', async () => {
    const discovered = await collectRuntimeExceptionClassNames(
      SRC_DIR,
      RuntimeException,
    );
    const expected = new Set(CASES.map((c) => c.build().constructor.name));
    const missing = discovered.filter((name) => !expected.has(name));
    expect(missing).toEqual([]);
  });
});

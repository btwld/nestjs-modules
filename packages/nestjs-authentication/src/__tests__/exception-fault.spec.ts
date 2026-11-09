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
}[] = [
  {
    name: 'AuthenticationAccessTokenException',
    build: () => new AuthenticationAccessTokenException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationRefreshTokenException',
    build: () => new AuthenticationRefreshTokenException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationUserPortRequiredException',
    build: () => new AuthenticationUserPortRequiredException(),
    fault: 'usage',
  },
  {
    name: 'LocalInvalidPasswordException',
    build: () => new LocalInvalidPasswordException('someUser'),
    fault: 'client',
  },
  {
    name: 'LocalUserInactiveException',
    build: () => new LocalUserInactiveException('someUser'),
    fault: 'client',
  },
  {
    name: 'LocalUsernameNotFoundException',
    build: () => new LocalUsernameNotFoundException('someUser'),
    fault: 'client',
  },
  {
    name: 'VerifyOtpInvalidException',
    build: () => new VerifyOtpInvalidException(),
    fault: 'client',
  },
  {
    name: 'AuthenticationEmailException',
    build: () => new AuthenticationEmailException(),
    fault: 'internal',
  },
  {
    name: 'AuthenticationException (default)',
    build: () => new AuthenticationException(),
    fault: 'internal',
  },
  {
    name: 'TokenAlreadyRevokedException',
    build: () => new TokenAlreadyRevokedException('token-id'),
    fault: 'client',
  },
  {
    name: 'TokenException (default)',
    build: () => new TokenException(),
    fault: 'internal',
  },
  {
    name: 'AuthenticationFeatureConfigException',
    build: () =>
      new AuthenticationFeatureConfigException('someFeature', ['somePort']),
    fault: 'usage',
  },
  {
    name: 'JwtVerifyException',
    build: () => new JwtVerifyException(),
    fault: 'client',
  },
  {
    name: 'JwtException (default)',
    build: () => new JwtException(),
    fault: 'internal',
  },
  {
    name: 'RecoveryOtpInvalidException',
    build: () => new RecoveryOtpInvalidException(),
    fault: 'client',
  },
  {
    name: 'RecoveryException (default)',
    build: () => new RecoveryException(),
    fault: 'internal',
  },
  {
    name: 'VerifyException (default)',
    build: () => new VerifyException(),
    fault: 'internal',
  },
  {
    name: 'AuthRouterAuthenticationFailedException',
    build: () =>
      new AuthRouterAuthenticationFailedException('someProvider', 'reason'),
    fault: 'client',
  },
  {
    name: 'AuthRouterConfigNotAvailableException',
    build: () => new AuthRouterConfigNotAvailableException(),
    fault: 'usage',
  },
  {
    name: 'AuthRouterGuardInvalidException',
    build: () => new AuthRouterGuardInvalidException('someProvider'),
    fault: 'usage',
  },
  {
    name: 'AuthRouterProviderMissingException',
    build: () => new AuthRouterProviderMissingException(),
    fault: 'client',
  },
  {
    name: 'AuthRouterProviderNotSupportedException',
    build: () => new AuthRouterProviderNotSupportedException('someProvider'),
    fault: 'client',
  },
  {
    name: 'AuthRouterException (default)',
    build: () => new AuthRouterException(),
    fault: 'internal',
  },
  {
    name: 'JwtAuthenticationException (default)',
    build: () => new JwtAuthenticationException(),
    fault: 'internal',
  },
  {
    name: 'JwtUnauthorizedException',
    build: () => new JwtUnauthorizedException(),
    fault: 'client',
  },
  {
    name: 'LocalInvalidCredentialsException',
    build: () => new LocalInvalidCredentialsException(),
    fault: 'client',
  },
  {
    name: 'LocalInvalidLoginDataException',
    build: () => new LocalInvalidLoginDataException(),
    fault: 'client',
  },
  {
    name: 'LocalUnauthorizedException (default)',
    build: () => new LocalUnauthorizedException(),
    fault: 'internal',
  },
  {
    name: 'LocalException (default)',
    build: () => new LocalException(),
    fault: 'internal',
  },
  {
    name: 'RefreshUnauthorizedException',
    build: () => new RefreshUnauthorizedException(),
    fault: 'client',
  },
  {
    name: 'RefreshException (default)',
    build: () => new RefreshException(),
    fault: 'internal',
  },
];

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('exception fault classification', () => {
  it.each(CASES)('$name has fault=$fault', ({ build, fault }) => {
    expect(build().fault).toEqual(fault);
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

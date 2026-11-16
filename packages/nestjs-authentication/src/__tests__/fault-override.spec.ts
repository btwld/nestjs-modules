import { AuthenticationAccessTokenException } from '../application/exceptions/authentication-access-token.exception.js';
import { AuthenticationRefreshTokenException } from '../application/exceptions/authentication-refresh-token.exception.js';
import { AuthenticationUserPortRequiredException } from '../application/exceptions/authentication-user-port-required.exception.js';
import { AuthenticationFeatureConfigException } from '../infrastructure/exceptions/authentication-feature-config.exception.js';
import { JwtUnauthorizedException } from '../infrastructure/strategies/jwt/exceptions/jwt-unauthorized.exception.js';
import { RefreshUnauthorizedException } from '../infrastructure/strategies/refresh/exceptions/refresh-unauthorized.exception.js';

/**
 * Regression check for classes whose constructor previously spread
 * `...options` before setting `fault`, silently discarding a caller's
 * `fault` override while `httpStatus` (correctly excluded from the options
 * type) stayed pinned. `fault` must now be settable the same way it is on
 * every other exception in this package.
 */
describe('fault is overridable via options, not silently discarded', () => {
  it('AuthenticationAccessTokenException accepts fault: usage', () => {
    expect(
      new AuthenticationAccessTokenException({ fault: 'usage' }).fault,
    ).toBe('usage');
  });

  it('AuthenticationRefreshTokenException accepts fault: usage', () => {
    expect(
      new AuthenticationRefreshTokenException({ fault: 'usage' }).fault,
    ).toBe('usage');
  });

  it('AuthenticationUserPortRequiredException accepts fault: client', () => {
    expect(
      new AuthenticationUserPortRequiredException({ fault: 'client' }).fault,
    ).toBe('client');
  });

  it('AuthenticationFeatureConfigException accepts fault: client', () => {
    expect(
      new AuthenticationFeatureConfigException('feature', ['port'], {
        fault: 'client',
      }).fault,
    ).toBe('client');
  });

  it('JwtUnauthorizedException accepts fault: internal', () => {
    expect(new JwtUnauthorizedException({ fault: 'internal' }).fault).toBe(
      'internal',
    );
  });

  it('RefreshUnauthorizedException accepts fault: internal', () => {
    expect(new RefreshUnauthorizedException({ fault: 'internal' }).fault).toBe(
      'internal',
    );
  });
});

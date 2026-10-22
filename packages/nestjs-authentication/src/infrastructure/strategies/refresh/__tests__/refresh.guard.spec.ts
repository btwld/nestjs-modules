import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

import { GuardsPolicy } from '../../../../domain/policies/guards.policy.js';
import { RefreshUnauthorizedException } from '../exceptions/refresh-unauthorized.exception.js';
import { REFRESH_STRATEGY_NAME } from '../refresh.constants.js';
import { RefreshGuard } from '../refresh.guard.js';

vi.mock('@nestjs/passport', () => ({
  AuthGuard: vi.fn().mockImplementation(() => vi.fn()),
}));

describe(RefreshGuard.name, () => {
  let guard: RefreshGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    context = mock<ExecutionContext>();
    guard = new RefreshGuard(
      new GuardsPolicy({ enable: true }),
      new Reflector(),
    );
  });

  it('should be configured with the refresh passport strategy', () => {
    expect(PassportAuthGuard).toHaveBeenCalledWith(REFRESH_STRATEGY_NAME);
  });

  describe('handleRequest', () => {
    it('should return the user on success', () => {
      const user = { id: 'user-1' };
      expect(guard.handleRequest(undefined, user)).toBe(user);
    });

    it('should throw RefreshUnauthorizedException when an error is provided', () => {
      const err = new Error('token expired');
      expect(() => guard.handleRequest(err, undefined)).toThrow(
        RefreshUnauthorizedException,
      );
    });

    it('should throw RefreshUnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(undefined, undefined)).toThrow(
        RefreshUnauthorizedException,
      );
    });

    it('should throw RefreshUnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(undefined, null)).toThrow(
        RefreshUnauthorizedException,
      );
    });

    it('should include the info error as originalError when only info is provided', () => {
      const info = new Error('jwt expired');
      let caught: unknown;
      try {
        guard.handleRequest(undefined, undefined, info);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(RefreshUnauthorizedException);
      if (caught instanceof RefreshUnauthorizedException) {
        expect(caught.context.originalError).toBe(info);
      }
    });
  });

  describe('canActivate', () => {
    it('should delegate to the passport canActivate', () => {
      const spy = vi
        .spyOn(RefreshGuard.prototype, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(spy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);
    });
  });
});

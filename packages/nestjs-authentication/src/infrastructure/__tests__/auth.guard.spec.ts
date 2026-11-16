import { of } from 'rxjs';
import { mock } from 'vitest-mock-extended';

import {
  type ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

import {
  getAppContext,
  OverlayImmutableException,
} from '@concepta/nestjs-core';

import { GuardsPolicy } from '../../domain/policies/guards.policy.js';
import { AuthUserCtx } from '../../gateways/auth-user-context.overlay.js';
import { AuthGuard } from '../auth.guard.js';
import { AuthPublic } from '../decorators/auth-public.decorator.js';
import { AuthTransportUnsupportedException } from '../exceptions/auth-transport-unsupported.exception.js';
import { AuthUserConflictException } from '../exceptions/auth-user-conflict.exception.js';

vi.mock('@nestjs/passport', () => ({
  AuthGuard: vi.fn().mockImplementation(() => vi.fn()),
}));

describe(AuthGuard.name, () => {
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    mockContext = mock<ExecutionContext>();
  });

  it('should use PassportAuthGuard for Express', () => {
    AuthGuard('local');
    expect(PassportAuthGuard).toHaveBeenCalledWith('local');
  });

  it('should always activate if guards are disabled globally', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: false }),
      reflector,
    );
    expect(await guardInstance.canActivate(mockContext)).toBe(true);
  });

  // Only `canDisable: true` lets a guard be turned off; options without it
  // build one that always authenticates.
  it('should authenticate even with guards disabled when built without canDisable', async () => {
    const Guard = AuthGuard('local', {});
    const authenticate = vi.fn(async () => false);
    Reflect.set(
      Object.getPrototypeOf(Guard.prototype),
      'canActivate',
      authenticate,
    );
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: false }),
      reflector,
    );

    expect(await guardInstance.canActivate(mockContext)).toBe(false);
    expect(authenticate).toHaveBeenCalled();
  });

  it('should respect disable callback', async () => {
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: false }),
      reflector,
    );
    expect(await guardInstance.canActivate(mockContext)).toBe(true);
  });

  it('should respect enable guard and disabled from reflector callback', async () => {
    vi.spyOn(reflector, 'get')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(undefined);
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: true }),
      reflector,
    );
    expect(await guardInstance.canActivate(mockContext)).toBe(true);
  });

  it('should respect guards.disable callback', async () => {
    vi.spyOn(reflector, 'get').mockReturnValue(undefined);
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: true, disable: () => true }),
      reflector,
    );
    expect(await guardInstance.canActivate(mockContext)).toBe(true);
  });

  describe('the authenticated user', () => {
    class Routes {
      guarded() {
        return null;
      }

      @AuthPublic()
      public() {
        return null;
      }

      @AuthPublic({ optional: true })
      optional() {
        return null;
      }
    }

    @AuthPublic({ classLevel: true, optional: true })
    class OptionalRoutes {
      @AuthPublic()
      plain() {
        return null;
      }
    }

    const routes = new Routes();

    /**
     * A guard whose Passport authentication does `outcome` to the request:
     * the mocked Passport base gets that as its `canActivate`, reading the
     * request through `getRequest` as Passport does.
     */
    const guardAuthenticating = (
      outcome: (request: object) => boolean,
      { canDisable = true, policy = new GuardsPolicy({ enable: true }) } = {},
    ) => {
      const Guard = AuthGuard('jwt', { canDisable });
      Reflect.set(
        Object.getPrototypeOf(Guard.prototype),
        'canActivate',
        async function (
          this: { getRequest(context: ExecutionContext): unknown },
          context: ExecutionContext,
        ) {
          const request = this.getRequest(context);
          if (typeof request !== 'object' || request === null) {
            throw new Error('no request');
          }
          return outcome(request);
        },
      );
      return new Guard(policy, new Reflector());
    };

    const httpContext = (
      handler: () => null,
      request: object,
      controller: new () => object = Routes,
    ) => {
      const http = mock<ReturnType<ExecutionContext['switchToHttp']>>();
      http.getRequest.mockReturnValue(request);
      const context = mock<ExecutionContext>();
      context.getType.mockReturnValue('http');
      context.switchToHttp.mockReturnValue(http);
      context.getHandler.mockReturnValue(handler);
      context.getClass.mockReturnValue(controller);
      return context;
    };

    const signIn = (request: object) => {
      Object.assign(request, { user: { id: 'u1' } });
      return true;
    };

    it('is defined immutably by the guard that authenticates the call', async () => {
      const request = {};

      await guardAuthenticating(signIn).canActivate(
        httpContext(routes.guarded, request),
      );

      const ctx = getAppContext(request);
      expect(ctx.with(AuthUserCtx)).toEqual({ user: { id: 'u1' } });
      expect(() =>
        ctx.defineOverlay(AuthUserCtx, { user: { id: 'u2' } }),
      ).toThrow(OverlayImmutableException);
    });

    it('stays defined when a second guard authenticates the same user', async () => {
      const request = {};
      const context = httpContext(routes.guarded, request);

      await guardAuthenticating(signIn).canActivate(context);
      expect(await guardAuthenticating(signIn).canActivate(context)).toBe(true);

      expect(getAppContext(request).with(AuthUserCtx).user?.id).toBe('u1');
    });

    it('refuses a call on which a second guard authenticates someone else', async () => {
      const context = httpContext(routes.guarded, {});

      await guardAuthenticating(signIn).canActivate(context);

      await expect(
        guardAuthenticating((r) => {
          Object.assign(r, { user: { id: 'u2' } });
          return true;
        }).canActivate(context),
      ).rejects.toThrow(AuthUserConflictException);
    });

    it('refuses a call its authentication declines, defining no user', async () => {
      const request = {};

      expect(
        await guardAuthenticating(() => false).canActivate(
          httpContext(routes.guarded, request),
        ),
      ).toBe(false);
      expect(getAppContext(request).supports(AuthUserCtx)).toBe(false);
    });

    it('defines no user when authentication lets a call through without one', async () => {
      const request = {};

      expect(
        await guardAuthenticating(() => true).canActivate(
          httpContext(routes.guarded, request),
        ),
      ).toBe(true);
      expect(getAppContext(request).supports(AuthUserCtx)).toBe(false);
    });

    it('accepts an authentication that answers with an observable', async () => {
      const Guard = AuthGuard('jwt', { canDisable: true });
      Reflect.set(Object.getPrototypeOf(Guard.prototype), 'canActivate', () =>
        of(true),
      );
      const guard = new Guard(
        new GuardsPolicy({ enable: true }),
        new Reflector(),
      );

      expect(await guard.canActivate(httpContext(routes.guarded, {}))).toBe(
        true,
      );
    });

    // Outside HTTP the request a strategy would read is the caller's own
    // payload, so nothing is authenticated from it.
    describe('outside HTTP', () => {
      const messageTo = (handler: () => null) => {
        const context = mock<ExecutionContext>();
        context.getType.mockReturnValue('rpc');
        context.getHandler.mockReturnValue(handler);
        context.getClass.mockReturnValue(Routes);
        return context;
      };

      it.each([
        [
          'that can be turned off, on a handler that is not public',
          true,
          routes.guarded,
        ],
        [
          'that cannot be turned off, on a guarded handler',
          false,
          routes.guarded,
        ],
        [
          'that cannot be turned off, on a public handler',
          false,
          routes.public,
        ],
        [
          'that cannot be turned off, on an optional handler',
          false,
          routes.optional,
        ],
      ])(
        'refuses the call in a guard %s, reading nothing',
        async (_name, canDisable, handler) => {
          const authenticate = vi.fn(() => true);
          const context = messageTo(handler);

          await expect(
            guardAuthenticating(authenticate, { canDisable }).canActivate(
              context,
            ),
          ).rejects.toThrow(
            expect.objectContaining({
              constructor: AuthTransportUnsupportedException,
              context: expect.objectContaining({ transport: 'rpc' }),
            }),
          );
          expect(authenticate).not.toHaveBeenCalled();
          expect(context.switchToHttp).not.toHaveBeenCalled();
        },
      );

      it.each([
        ['guards are off', new GuardsPolicy({ enable: false })],
        [
          'the disable callback turns the guard off',
          new GuardsPolicy({ enable: true, disable: () => true }),
        ],
      ])(
        'lets the call through when %s, reading nothing',
        async (_name, policy) => {
          const authenticate = vi.fn(() => true);
          const context = messageTo(routes.guarded);

          expect(
            await guardAuthenticating(authenticate, { policy }).canActivate(
              context,
            ),
          ).toBe(true);
          expect(authenticate).not.toHaveBeenCalled();
          expect(context.switchToHttp).not.toHaveBeenCalled();
        },
      );

      // Passport reads the request through `getRequest`, so a guard that
      // returns its own transport's request authenticates those calls.
      it('authenticates a guard that reads its own transport’s request', async () => {
        const request = {};
        const Guard = AuthGuard('jwt');
        class MessageGuard extends Guard {
          getRequest(): unknown {
            return request;
          }
        }
        Reflect.set(
          Object.getPrototypeOf(Guard.prototype),
          'canActivate',
          async function (this: { getRequest(): unknown }) {
            return this.getRequest() === request;
          },
        );
        const context = messageTo(routes.guarded);

        expect(
          await new MessageGuard(
            new GuardsPolicy({ enable: true }),
            new Reflector(),
          ).canActivate(context),
        ).toBe(true);
        expect(context.switchToHttp).not.toHaveBeenCalled();
      });

      it.each([
        ['public', routes.public],
        ['optional', routes.optional],
      ])(
        'lets a %s handler through without authenticating, reading nothing',
        async (_name, handler) => {
          const authenticate = vi.fn(() => true);
          const context = messageTo(handler);

          expect(
            await guardAuthenticating(authenticate).canActivate(context),
          ).toBe(true);
          expect(authenticate).not.toHaveBeenCalled();
          expect(context.switchToHttp).not.toHaveBeenCalled();
        },
      );
    });

    it('leaves an optional route anonymous when authentication declines without refusing', async () => {
      const request = {};

      expect(
        await guardAuthenticating(() => false).canActivate(
          httpContext(routes.optional, request),
        ),
      ).toBe(true);
      expect(getAppContext(request).supports(AuthUserCtx)).toBe(false);
    });

    it('leaves an optional route anonymous when authentication refuses', async () => {
      const request = {};
      const guard = guardAuthenticating(() => {
        throw new UnauthorizedException();
      });

      expect(
        await guard.canActivate(httpContext(routes.optional, request)),
      ).toBe(true);
      expect(getAppContext(request).supports(AuthUserCtx)).toBe(false);
    });

    it('fails an optional route on any failure other than a refusal', async () => {
      const guard = guardAuthenticating(() => {
        throw new InternalServerErrorException();
      });

      await expect(
        guard.canActivate(httpContext(routes.optional, {})),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('refuses a second user on an optional route, rather than going on as nobody', async () => {
      const context = httpContext(routes.optional, {});

      await guardAuthenticating(signIn).canActivate(context);

      await expect(
        guardAuthenticating((r) => {
          Object.assign(r, { user: { id: 'u2' } });
          return true;
        }).canActivate(context),
      ).rejects.toThrow(AuthUserConflictException);
    });

    it('refuses a second user when either has no id to compare', async () => {
      const context = httpContext(routes.guarded, {});

      await guardAuthenticating((r) => {
        Object.assign(r, { user: { name: 'first' } });
        return true;
      }).canActivate(context);

      await expect(
        guardAuthenticating((r) => {
          Object.assign(r, { user: { name: 'second' } });
          return true;
        }).canActivate(context),
      ).rejects.toThrow(AuthUserConflictException);
    });

    it('lets a method’s plain @AuthPublic() override its controller’s optional', async () => {
      const request = {};
      const authenticate = vi.fn(signIn);

      await guardAuthenticating(authenticate).canActivate(
        httpContext(new OptionalRoutes().plain, request, OptionalRoutes),
      );

      expect(authenticate).not.toHaveBeenCalled();
      expect(getAppContext(request).supports(AuthUserCtx)).toBe(false);
    });

    it('signs a caller in on an optional route when authentication succeeds', async () => {
      const request = {};

      await guardAuthenticating(signIn).canActivate(
        httpContext(routes.optional, request),
      );

      expect(getAppContext(request).with(AuthUserCtx)).toEqual({
        user: { id: 'u1' },
      });
    });
  });
});

import { type CanActivate, Controller, Get, Injectable } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import {
  type AuditedRouteInterface,
  CoreModule,
  isPublicRoute,
  RouteAuditFailedException,
} from '@concepta/nestjs-core';

import { mockPasswordPortSettings } from '../../../__tests__/fixtures/ports/mock-password-port.provider.js';
import { mockUserPortSettings } from '../../../__tests__/fixtures/ports/mock-user-port.provider.js';
import {
  stubOtpPortSettings,
  stubRecoveryNotificationPortSettings,
  stubVerifyNotificationPortSettings,
} from '../../../__tests__/fixtures/ports/stub-unused-ports.fixture.js';
import { AuthenticationModule } from '../../../authentication.module.js';
import { GuardsPolicy } from '../../../domain/policies/guards.policy.js';
import { AuthGuard } from '../../auth.guard.js';
import { AuthPublic } from '../../decorators/auth-public.decorator.js';
import { AuthenticationGuard } from '../../decorators/authentication-guard.decorator.js';
import { AuthRouterGuard } from '../../router/auth-router.guard.js';
import { JwtGuard } from '../../strategies/jwt/jwt.guard.js';
import { LocalGuard } from '../../strategies/local/local.guard.js';
import { RequireAuthRouteAuditRule } from '../require-auth-route-audit.rule.js';

@Injectable()
class ThrottleGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

class ApiKeyGuard extends AuthGuard('api-key') {}

@Injectable()
@AuthenticationGuard()
class SignatureGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

class StrictSignatureGuard extends SignatureGuard {}

function route(
  id: string,
  guards: AuditedRouteInterface['guards'] = [],
  open = false,
): AuditedRouteInterface {
  return {
    id,
    method: id.slice(0, id.indexOf(' ')),
    controller: class {},
    handler: () => {},
    guards,
    public: open,
  };
}

const rule = new RequireAuthRouteAuditRule(new GuardsPolicy(), false);

describe(RequireAuthRouteAuditRule.name, () => {
  it('passes every route when an authentication guard runs globally', () => {
    expect(
      rule.audit({
        routes: [route('GET /a'), route('GET /b')],
        globalGuards: [ThrottleGuard, JwtGuard],
      }),
    ).toEqual([]);
  });

  it('flags a route no authentication guard runs on', () => {
    expect(
      rule.audit({
        routes: [
          route('POST /login', [LocalGuard]),
          route('GET /oauth', [AuthRouterGuard]),
          route('GET /keys', [ThrottleGuard, ApiKeyGuard]),
          route('POST /hooks', [SignatureGuard]),
          route('PUT /hooks', [StrictSignatureGuard]),
          route('GET /health', [], true),
          route('GET /open', [ThrottleGuard]),
        ],
        globalGuards: [ThrottleGuard],
      }),
    ).toEqual([
      {
        route: 'GET /open',
        message:
          'No authentication guard runs on this route. Apply one, or mark the route @AuthPublic() if it is open on purpose.',
      },
    ]);
  });

  it('reports once when no route is authenticated', () => {
    expect(
      rule.audit({
        routes: [route('GET /a'), route('GET /b'), route('GET /c', [], true)],
        globalGuards: [ThrottleGuard],
      }),
    ).toEqual([
      {
        message:
          'No authentication guard runs on any route. Configure settings.strategies.jwt to register the JWT guard globally, or mark the routes that are open on purpose with @AuthPublic().',
      },
    ]);
  });

  it('reports once when authentication guards are turned off', () => {
    const off = new RequireAuthRouteAuditRule(
      new GuardsPolicy({ enable: false }),
      false,
    );

    expect(
      off.audit({ routes: [route('GET /a')], globalGuards: [JwtGuard] }),
    ).toEqual([
      {
        message:
          'Authentication guards are turned off (settings.guards.enable is false), so the JWT guard lets every call through. Turn them back on.',
      },
    ]);
  });

  it('does not take a plain-object appGuard for every plain-object guard', () => {
    const plain = new RequireAuthRouteAuditRule(new GuardsPolicy(), {
      canActivate: () => true,
    });
    const flag = { canActivate: () => true };

    expect(
      plain.audit({
        routes: [route('GET /a', [flag.constructor])],
        globalGuards: [flag.constructor],
      }),
    ).toEqual([
      {
        route: 'GET /a',
        message:
          'No authentication guard runs on this route. Apply one, or mark the route @AuthPublic() if it is open on purpose.',
      },
    ]);
  });

  it('marks @AuthPublic() routes public for the audit', () => {
    class Routes {
      @AuthPublic()
      open(): void {}
    }

    expect(isPublicRoute(Routes.prototype.open)).toBe(true);
  });

  describe('in an application', () => {
    @Controller('reports')
    class ReportController {
      @Get()
      list(): void {}
    }

    async function boot(appGuard?: false | CanActivate): Promise<void> {
      const moduleRef = await Test.createTestingModule({
        imports: [
          CqrsModule,
          CoreModule.forRoot({ routeAudit: {} }),
          AuthenticationModule.forRoot({
            ...(appGuard === undefined ? {} : { appGuard }),
            settings: {
              jwt: {
                access: { secret: 'access', signOptions: { expiresIn: '1h' } },
                refresh: {
                  secret: 'refresh',
                  signOptions: { expiresIn: '7d' },
                },
              },
              strategies: { jwt: {} },
            },
            ports: {
              user: mockUserPortSettings,
              password: mockPasswordPortSettings,
              otp: stubOtpPortSettings,
              recoveryNotification: stubRecoveryNotificationPortSettings,
              verifyNotification: stubVerifyNotificationPortSettings,
            },
          }),
        ],
        controllers: [ReportController],
      }).compile();

      // `close` waits on the start, so it rejects with the same error.
      try {
        await moduleRef.init();
      } finally {
        await moduleRef.close();
      }
    }

    it('starts behind the global JWT guard', async () => {
      await expect(boot()).resolves.toBeUndefined();
    });

    it('starts behind a guard given as appGuard', async () => {
      @Injectable()
      class SessionGuard implements CanActivate {
        canActivate(): boolean {
          return true;
        }
      }

      await expect(boot(new SessionGuard())).resolves.toBeUndefined();
    });

    it('fails to start when no authentication guard runs', async () => {
      const failure = await boot(false).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(RouteAuditFailedException);
      expect(failure).toHaveProperty(
        'message',
        'The route audit found 1 violation(s):\n' +
          '  - [requireAuth] GET /reports: No authentication guard runs on this route. Apply one, or mark the route @AuthPublic() if it is open on purpose.',
      );
    });
  });
});

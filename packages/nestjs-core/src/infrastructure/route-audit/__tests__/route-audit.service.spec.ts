import {
  type CanActivate,
  Controller,
  Get,
  Inject,
  Injectable,
  Logger,
  Module,
  Post,
  type Provider,
  Put,
  Scope,
  type Type,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { CoreModule } from '../../../core.module.js';
import { PublicRoute } from '../decorators/public-route.decorator.js';
import { RouteAuditRuleProvider } from '../decorators/route-audit-rule-provider.decorator.js';
import { RouteAuditFailedException } from '../exceptions/route-audit-failed.exception.js';
import { type RouteAuditRuleInterface } from '../interfaces/route-audit-rule.interface.js';
import { type RouteAuditSettingsInterface } from '../interfaces/route-audit-settings.interface.js';
import { type RouteAuditSubjectInterface } from '../interfaces/route-audit-subject.interface.js';
import { type RouteAuditViolationInterface } from '../interfaces/route-audit-violation.interface.js';

@Injectable()
class ClassGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
class RouteGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
class GlobalGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestGlobalGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Controller('invoices')
@UseGuards(ClassGuard)
class InvoiceController {
  @Get()
  @PublicRoute()
  list(): void {}

  @Get(':id')
  @UseGuards(RouteGuard, new GlobalGuard())
  one(): void {}

  @Post(['', 'bulk'])
  create(): void {}

  @Put('/:id/')
  @Version('2')
  replace(): void {}

  helper(): void {}
}

@Controller()
@PublicRoute()
class HealthController {
  @Get('health')
  health(): void {}
}

let seen: RouteAuditSubjectInterface | undefined;
let found: RouteAuditViolationInterface[] = [];
let runs = 0;

@Injectable()
@RouteAuditRuleProvider()
class ProbeRule implements RouteAuditRuleInterface {
  readonly name = 'probe';

  audit(subject: RouteAuditSubjectInterface): RouteAuditViolationInterface[] {
    seen = subject;
    runs++;
    return found;
  }
}

/** Starts and closes an application; a failed start rejects with its error. */
async function boot(
  routeAudit?: RouteAuditSettingsInterface,
  extra: {
    global?: boolean;
    controllers?: Type[];
    providers?: Provider[];
  } = {},
): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [CoreModule.forRoot(routeAudit ? { routeAudit } : {})],
    controllers: extra.controllers ?? [InvoiceController, HealthController],
    providers: [
      ProbeRule,
      ...(extra.providers ?? []),
      ...(extra.global
        ? [
            { provide: APP_GUARD, useClass: GlobalGuard },
            { provide: APP_GUARD, useClass: RequestGlobalGuard },
            { provide: APP_GUARD, useFactory: () => null },
          ]
        : []),
    ],
  }).compile();

  // `close` waits on the start, so it rejects with the same error.
  try {
    await moduleRef.init();
  } finally {
    await moduleRef.close();
  }
}

describe('RouteAuditService', () => {
  beforeEach(() => {
    seen = undefined;
    found = [];
    runs = 0;
  });

  it('runs no rule unless the audit is turned on', async () => {
    await boot();

    expect(runs).toBe(0);
  });

  it('names a version-neutral route, and a route on a host, apart', async () => {
    @Controller({ path: 'status', host: 'admin.example.com' })
    class AdminStatusController {
      @Get()
      @Version(VERSION_NEUTRAL)
      show(): void {}

      @Get('all')
      @Version(['1', VERSION_NEUTRAL])
      all(): void {}
    }

    await boot({}, { controllers: [AdminStatusController] });

    expect(seen?.routes.map((route) => route.id)).toEqual([
      'GET /status neutral @admin.example.com',
      'GET /status/all v1,neutral @admin.example.com',
    ]);
  });

  it('leaves out a request-scoped global guard built by a factory', async () => {
    await boot(
      {},
      {
        providers: [
          {
            provide: APP_GUARD,
            scope: Scope.REQUEST,
            useFactory: () => new GlobalGuard(),
          },
        ],
      },
    );

    expect(seen?.globalGuards).toEqual([]);
  });

  it('gives each rule every HTTP route and the global guards', async () => {
    await boot({}, { global: true });

    expect(seen?.routes.map((route) => route.id)).toEqual([
      'GET /invoices',
      'GET /invoices/:id',
      'POST /invoices',
      'POST /invoices/bulk',
      'PUT /invoices/:id v2',
      'GET /health',
    ]);
    expect(
      seen?.routes.map((route) => [
        route.id,
        route.method,
        route.guards,
        route.public,
      ]),
    ).toEqual([
      ['GET /invoices', 'GET', [ClassGuard], true],
      [
        'GET /invoices/:id',
        'GET',
        [ClassGuard, RouteGuard, GlobalGuard],
        false,
      ],
      ['POST /invoices', 'POST', [ClassGuard], false],
      ['POST /invoices/bulk', 'POST', [ClassGuard], false],
      ['PUT /invoices/:id v2', 'PUT', [ClassGuard], false],
      ['GET /health', 'GET', [], true],
    ]);
    expect(seen?.routes[0]?.controller).toBe(InvoiceController);
    expect(seen?.routes[0]?.handler).toBe(InvoiceController.prototype.list);
    expect(seen?.globalGuards).toEqual([GlobalGuard, RequestGlobalGuard]);
  });

  it('reports a violation once however many modules provide its rule', async () => {
    found = [{ route: 'GET /invoices', message: 'first' }];

    const failure = await boot(
      {},
      { providers: [{ provide: 'again', useClass: ProbeRule }] },
    ).catch((error: unknown) => error);

    expect(runs).toBe(2);
    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        '  - [probe] GET /invoices: first',
    );
  });

  it('runs each module’s instance of a rule with its own settings', async () => {
    const STRICT = Symbol('STRICT');

    @Injectable()
    @RouteAuditRuleProvider()
    class StrictRule implements RouteAuditRuleInterface {
      readonly name = 'strict';

      constructor(@Inject(STRICT) private readonly strict: boolean) {}

      audit(): RouteAuditViolationInterface[] {
        return this.strict ? [{ message: 'strict' }] : [];
      }
    }

    @Module({ providers: [{ provide: STRICT, useValue: true }, StrictRule] })
    class StrictModule {}

    @Module({ providers: [{ provide: STRICT, useValue: false }, StrictRule] })
    class LenientModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({ routeAudit: {} }),
        StrictModule,
        LenientModule,
      ],
    }).compile();

    const failure = await moduleRef
      .init()
      .finally(() => moduleRef.close())
      .catch((error: unknown) => error);

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        '  - [strict] application: strict',
    );
  });

  it('fails startup with every violation', async () => {
    found = [
      { route: 'GET /invoices', message: 'first' },
      { message: 'whole app' },
    ];

    const failure = await boot({}).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RouteAuditFailedException);
    expect(failure).toHaveProperty(
      'message',
      'The route audit found 2 violation(s):\n' +
        '  - [probe] GET /invoices: first\n' +
        '  - [probe] application: whole app',
    );
  });

  it('logs every violation and starts in report mode', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    found = [{ route: 'GET /invoices', message: 'first' }];

    try {
      await boot({ mode: 'report' });

      expect(warn).toHaveBeenCalledWith(
        '[probe] GET /invoices: first',
        'RouteAuditService',
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('exempts an allowed route from its rule only', async () => {
    found = [{ route: 'GET /invoices', message: 'first' }];

    await expect(
      boot({ allow: { probe: ['GET /invoices'] } }),
    ).resolves.toBeUndefined();
  });

  it('does not exempt a fault of the whole application', async () => {
    found = [{ message: 'whole app' }];

    await expect(boot({ allow: { probe: ['GET /invoices'] } })).rejects.toThrow(
      /\[probe\] application: whole app/,
    );
  });

  it('refuses an allow entry that exempts nothing', async () => {
    found = [{ route: 'GET /invoices', message: 'first' }];

    const failure = await boot({
      allow: {
        probe: ['GET /invoices', 'GET /gone', 'GET /health'],
        other: ['GET /invoices'],
      },
    }).catch((error: unknown) => error);

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 3 violation(s):\n' +
        "  - [allow] GET /gone: exempts nothing under probe: no route has this id, or probe doesn't flag it. Remove the entry.\n" +
        "  - [allow] GET /health: exempts nothing under probe: no route has this id, or probe doesn't flag it. Remove the entry.\n" +
        "  - [allow] GET /invoices: exempts nothing under other: no route has this id, or other doesn't flag it. Remove the entry.",
    );
  });

  it('refuses an allow entry that names several routes', async () => {
    @Controller('invoices')
    class ShadowController {
      @Get()
      list(): void {}
    }

    found = [{ route: 'GET /invoices', message: 'first' }];

    const failure = await boot(
      { allow: { probe: ['GET /invoices'] } },
      { controllers: [InvoiceController, ShadowController] },
    ).catch((error: unknown) => error);

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        '  - [allow] GET /invoices: names 2 routes under probe; an exemption names one route. Give the routes different paths, versions or hosts.',
    );
  });

  it('puts the path RouterModule mounts a module at in its route ids', async () => {
    @Controller('users')
    class UserController {
      @Get()
      list(): void {}
    }

    @Module({ controllers: [UserController] })
    class AdminModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({ routeAudit: {} }),
        AdminModule,
        RouterModule.register([{ path: 'admin', module: AdminModule }]),
      ],
      providers: [ProbeRule],
    }).compile();

    await moduleRef.init();
    await moduleRef.close();

    expect(seen?.routes.map((route) => route.id)).toEqual(['GET /admin/users']);
  });

  it('refuses a rule that cannot run at startup', async () => {
    @Injectable({ scope: Scope.REQUEST })
    @RouteAuditRuleProvider()
    class RequestRule extends ProbeRule {}

    const failure = await boot({}, { providers: [RequestRule] }).catch(
      (error: unknown) => error,
    );

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        "  - [audit] RequestRule: is a @RouteAuditRuleProvider() that can't run at startup. A rule needs a name and an audit method, and neither it nor anything it injects may be request-scoped.",
    );
  });

  it('refuses two rule classes under one name', async () => {
    @Injectable()
    @RouteAuditRuleProvider()
    class OtherProbeRule extends ProbeRule {}

    const failure = await boot({}, { providers: [OtherProbeRule] }).catch(
      (error: unknown) => error,
    );

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        '  - [audit] probe: 2 rule classes share this name. Give each rule its own name.',
    );
  });
});

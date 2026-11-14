import { Controller, Get, Post } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  type AuditedRouteInterface,
  CoreModule,
  PublicRoute,
  RouteAuditFailedException,
} from '@concepta/nestjs-core';

import { AccessControlModule } from '../../../access-control.module.js';
import { AccessControlCreateOne } from '../../decorators/access-control-create-one.decorator.js';
import { AccessControlReadMany } from '../../decorators/access-control-read-many.decorator.js';
import { RequireAclRouteAuditRule } from '../require-acl-route-audit.rule.js';

import { headerActorResolverFixture } from './fixtures/header-actor.resolver.fixture.js';

@Controller('invoices')
class InvoiceController {
  @Get()
  @AccessControlReadMany('invoice')
  list(): void {}

  @Post()
  create(): void {}

  @Get('health')
  @PublicRoute()
  health(): void {}
}

@Controller('reports')
@AccessControlCreateOne('report')
class ReportController {
  @Post()
  create(): void {}
}

function routesOf(
  controller: AuditedRouteInterface['controller'],
  ...entries: [id: string, handler: string, open?: boolean][]
): AuditedRouteInterface[] {
  return entries.map(([id, handler, open = false]) => ({
    id,
    controller,
    handler: Reflect.get(controller.prototype, handler),
    guards: [],
    public: open,
  }));
}

const MESSAGE =
  'No access-control grant on this route, so every signed-in caller may call it. Add a grant decorator, such as @AccessControlReadMany(), or allow the route under requireAcl if every caller may.';

describe(RequireAclRouteAuditRule.name, () => {
  const rule = new RequireAclRouteAuditRule(new Reflector());

  it('flags a route that is not public and has no grant', () => {
    expect(
      rule.audit({
        routes: [
          ...routesOf(
            InvoiceController,
            ['GET /invoices', 'list'],
            ['POST /invoices', 'create'],
            ['GET /invoices/health', 'health', true],
          ),
          ...routesOf(ReportController, ['POST /reports', 'create']),
        ],
        globalGuards: [],
      }),
    ).toEqual([{ route: 'POST /invoices', message: MESSAGE }]);
  });

  it('fails startup in an application', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({ routeAudit: {} }),
        AccessControlModule.forRoot({
          settings: { grants: {} },
          actorResolver: headerActorResolverFixture,
        }),
      ],
      controllers: [InvoiceController, ReportController],
    }).compile();

    // `close` waits on the start, so it rejects with the same error.
    const failure = await moduleRef
      .init()
      .finally(() => moduleRef.close())
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RouteAuditFailedException);
    expect(failure).toHaveProperty(
      'message',
      'The route audit found 1 violation(s):\n' +
        `  - [requireAcl] POST /invoices: ${MESSAGE}`,
    );
  });
});

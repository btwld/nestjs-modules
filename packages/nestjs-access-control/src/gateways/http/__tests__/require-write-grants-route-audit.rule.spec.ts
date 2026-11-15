import { All, Controller, Delete, Get, Post } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  type AuditedRouteInterface,
  CoreModule,
  RouteAuditFailedException,
} from '@concepta/nestjs-core';

import { AccessControlModule } from '../../../access-control.module.js';
import { AccessControlCreateOne } from '../../decorators/access-control-create-one.decorator.js';
import { AccessControlGrant } from '../../decorators/access-control-grant.decorator.js';
import { AccessControlReadMany } from '../../decorators/access-control-read-many.decorator.js';
import { RequireWriteGrantsRouteAuditRule } from '../require-write-grants-route-audit.rule.js';

import { headerActorResolverFixture } from './fixtures/header-actor.resolver.fixture.js';

@Controller('invoices')
class InvoiceController {
  @Get()
  @AccessControlReadMany('invoice')
  list(): void {}

  @Post()
  @AccessControlReadMany('invoice')
  readGranted(): void {}

  @Post('created')
  @AccessControlCreateOne('invoice')
  createGranted(): void {}

  @Post('approved')
  @AccessControlGrant({ resource: 'invoice', action: 'approve' })
  approveGranted(): void {}

  @Post('either')
  @AccessControlGrant(
    { resource: 'invoice', action: 'create' },
    { resource: 'invoice', action: 'read' },
  )
  eitherGranted(): void {}

  @All('any')
  @AccessControlReadMany('invoice')
  anyMethod(): void {}

  @Delete('ungranted')
  ungranted(): void {}
}

@Controller('reports')
@AccessControlReadMany('report')
class ReportController {
  @Post()
  create(): void {}

  @Post('own')
  @AccessControlCreateOne('report')
  createOwn(): void {}
}

function routesOf(
  controller: AuditedRouteInterface['controller'],
  ...entries: [id: string, handler: string][]
): AuditedRouteInterface[] {
  return entries.map(([id, handler]) => ({
    id,
    method: id.slice(0, id.indexOf(' ')),
    controller,
    handler: Reflect.get(controller.prototype, handler),
    guards: [],
    public: false,
  }));
}

const MESSAGE =
  "This route may write, but a read grant lets callers in, so every reader may call it. Grant the write's own action instead, such as @AccessControlCreateOne() or your own verb, or allow the route under requireWriteGrants if it only reads, such as a search.";

describe(RequireWriteGrantsRouteAuditRule.name, () => {
  const rule = new RequireWriteGrantsRouteAuditRule(new Reflector());

  const audit = (...routes: AuditedRouteInterface[]) =>
    rule.audit({ routes, globalGuards: [] });

  it('flags a write route whose only grant is read', () => {
    expect(
      audit(...routesOf(InvoiceController, ['POST /invoices', 'readGranted'])),
    ).toEqual([{ route: 'POST /invoices', message: MESSAGE }]);
  });

  it('flags a write route with a read grant beside a write one, since any grant lets a caller in', () => {
    expect(
      audit(
        ...routesOf(InvoiceController, [
          'POST /invoices/either',
          'eitherGranted',
        ]),
      ),
    ).toEqual([{ route: 'POST /invoices/either', message: MESSAGE }]);
  });

  it('counts a route on every method as a write', () => {
    expect(
      audit(...routesOf(InvoiceController, ['ALL /invoices/any', 'anyMethod'])),
    ).toEqual([{ route: 'ALL /invoices/any', message: MESSAGE }]);
  });

  it('flags a write route under a controller’s read grant', () => {
    expect(
      audit(...routesOf(ReportController, ['POST /reports', 'create'])),
    ).toEqual([{ route: 'POST /reports', message: MESSAGE }]);
  });

  it('reads a route’s own grants in place of its controller’s, as the guard does', () => {
    expect(
      audit(...routesOf(ReportController, ['POST /reports/own', 'createOwn'])),
    ).toEqual([]);
  });

  it('passes write routes granting create or a verb of your own, read routes granting read, and leaves ungranted routes to requireAcl', () => {
    expect(
      audit(
        ...routesOf(
          InvoiceController,
          ['GET /invoices', 'list'],
          ['POST /invoices/created', 'createGranted'],
          ['POST /invoices/approved', 'approveGranted'],
          ['DELETE /invoices/ungranted', 'ungranted'],
        ),
      ),
    ).toEqual([]);
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
      controllers: [ReportController],
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
        `  - [requireWriteGrants] POST /reports: ${MESSAGE}`,
    );
  });
});

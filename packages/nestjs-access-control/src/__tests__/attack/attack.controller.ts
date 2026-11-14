import { Body, Controller, Get, Post } from '@nestjs/common';

import { AuthPublic } from '@concepta/nestjs-authentication';
import { AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  Transactional,
  Where,
} from '@concepta/nestjs-repository';

import { AccessControlService } from '../../domain/services/access-control.service.js';
import { accessFieldPaths } from '../../domain/utils/access-field-paths.util.js';
import { AccessControlCreateOne } from '../../gateways/decorators/access-control-create-one.decorator.js';
import { AccessControlGrant } from '../../gateways/decorators/access-control-grant.decorator.js';
import { AccessControlReadMany } from '../../gateways/decorators/access-control-read-many.decorator.js';

import {
  type AttackCustomerEntity,
  type AttackInvoiceEntity,
} from './attack.entities.js';
import { INVOICES, LEDGERS, REPORTS } from './attack.rules.js';

/** Open to anyone: a load balancer's probe. */
@Controller('health')
export class AttackHealthController {
  @Get()
  @AuthPublic()
  check() {
    return { status: 'ok' };
  }
}

/** Routes written by hand, over the same repositories. */
@Controller('desk')
export class AttackDeskController {
  constructor(
    @InjectDynamicRepository(INVOICES)
    private readonly invoices: RepositoryInterface<AttackInvoiceEntity>,
    private readonly accessControl: AccessControlService,
  ) {}

  /** Each invoice with its customer. */
  @Get('invoices')
  @AccessControlReadMany(INVOICES)
  list(@Ctx() ctx: AppContextHost) {
    return this.invoices.find({ join: [{ relation: 'customer' }], ctx });
  }

  /** Invoices of customers allowed to owe a lot: filters a joined column. */
  @Get('invoices/large-credit')
  @AccessControlReadMany(INVOICES)
  largeCredit(@Ctx() ctx: AppContextHost) {
    return this.invoices.find({
      join: [{ relation: 'customer' }],
      where: Where.rel(
        'customer',
        Where.gt<AttackCustomerEntity>('creditLimit', 10000),
      ),
      ctx,
    });
  }

  /** Creates an invoice and its lines in one call, all or nothing. */
  @Post('invoices')
  @AccessControlCreateOne(INVOICES)
  @Transactional()
  async create(
    @Ctx() ctx: AppContextHost,
    @Body() body: Partial<AttackInvoiceEntity>,
  ) {
    await this.accessControl.assertFields(ctx, accessFieldPaths(body));
    return this.invoices.create(body, { ctx });
  }

  /**
   * A mistake: reads through a context of its own instead of the call's,
   * so nobody is acting on it. It must be refused, never run unrestricted.
   */
  @Get('invoices/detached')
  @AccessControlReadMany(INVOICES)
  detached() {
    return this.invoices.find({ ctx: new AppContextHost() });
  }

  /** A report no entity stands behind, left to access control's rules. */
  @Get('reports/aging')
  @AccessControlGrant({ resource: REPORTS, action: 'read' })
  aging() {
    return { buckets: [] };
  }

  /** A resource the authority doesn't know, and nobody exempted. */
  @Get('ledgers')
  @AccessControlGrant({ resource: LEDGERS, action: 'read' })
  ledgers() {
    return { entries: [] };
  }

  /** The caller's own rules, for a UI: needs no grant of its own. */
  @Get('me/permissions')
  permissions(@Ctx() ctx: AppContextHost) {
    return this.accessControl.effectiveRules(ctx);
  }
}

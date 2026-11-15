import { Body, Controller, Get, Param, Patch } from '@nestjs/common';

import {
  AccessControlReadOne,
  AccessControlService,
  AccessControlUpdateOne,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';
import { type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { BillingStore } from './billing.store.js';
import { type CustomerInterface } from './customer.interface.js';
import { type InvoiceInterface } from './invoice.interface.js';

/**
 * Routes partner systems call. Nothing here knows which partner is
 * calling: the grants decide.
 */
@Controller()
export class PartnerController {
  constructor(
    private readonly billing: BillingStore,
    private readonly accessControl: AccessControlService,
  ) {}

  @Patch('invoices/:id')
  @AccessControlUpdateOne('invoice')
  async updateInvoice(
    @Ctx() ctx: AppContextHost,
    @Param('id') id: string,
    @Body() changes: Partial<InvoiceInterface>,
  ): Promise<InvoiceInterface> {
    await this.accessControl.assertFields(ctx, accessFieldPaths(changes));

    return this.billing.updateInvoice(id, changes);
  }

  @Get('customers/:id')
  @AccessControlReadOne('customer')
  customer(@Param('id') id: string): CustomerInterface {
    return this.billing.customer(id);
  }
}

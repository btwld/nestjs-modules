import { Injectable } from '@nestjs/common';

import {
  AccessControlService,
  AccessCtx,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';
import { AppContextHost } from '@concepta/nestjs-core';

import { BillingStore } from './billing.store.js';
import { type InvoiceInterface } from './invoice.interface.js';
import { type PaymentEventInterface } from './payment-event.interface.js';

/**
 * Handles the billing system's payment events from a queue. There is no
 * HTTP request to resolve an actor from, so the consumer opens a context
 * for each message and defines the system it came from as the actor.
 */
@Injectable()
export class PaymentEventConsumer {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly billing: BillingStore,
  ) {}

  async handle(event: PaymentEventInterface): Promise<InvoiceInterface> {
    const ctx = new AppContextHost();
    ctx.defineOverlay(
      AccessCtx,
      { kind: 'system', name: 'billing' },
      { immutable: true },
    );

    await this.accessControl.assert(ctx, 'update:any', 'invoice', {
      fields: accessFieldPaths(event.changes),
    });

    return this.billing.updateInvoice(event.invoiceId, event.changes);
  }
}

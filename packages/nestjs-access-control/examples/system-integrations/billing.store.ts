import { Injectable, NotFoundException } from '@nestjs/common';

import { type CustomerInterface } from './customer.interface.js';
import { type InvoiceInterface } from './invoice.interface.js';

/**
 * In-memory invoices and customers, standing in for your repositories.
 */
@Injectable()
export class BillingStore {
  private invoices = new Map<string, InvoiceInterface>([
    ['inv-7', { id: 'inv-7', amount: 300, status: 'sent', paidAt: null }],
  ]);

  private readonly customers = new Map<string, CustomerInterface>([
    [
      'cus-1',
      { id: 'cus-1', name: 'Acme', email: 'ap@acme.test', cardNumber: '4242' },
    ],
  ]);

  invoice(id: string): InvoiceInterface {
    const invoice = this.invoices.get(id);

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  updateInvoice(
    id: string,
    changes: Partial<InvoiceInterface>,
  ): InvoiceInterface {
    const invoice = { ...this.invoice(id), ...changes, id };
    this.invoices = new Map(this.invoices).set(id, invoice);
    return invoice;
  }

  customer(id: string): CustomerInterface {
    const customer = this.customers.get(id);

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }
}

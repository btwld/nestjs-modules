import { randomUUID } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { type InvoiceInterface } from './invoice.interface.js';

/**
 * In-memory invoices, standing in for your repository.
 */
@Injectable()
export class InvoiceStore {
  private invoices = new Map<string, InvoiceInterface>([
    [
      'inv-1',
      {
        id: 'inv-1',
        customer: 'Acme',
        amount: 1200,
        status: 'sent',
        internalNotes: 'Slow payer; call before the due date',
      },
    ],
  ]);

  all(): InvoiceInterface[] {
    return [...this.invoices.values()];
  }

  find(id: string): InvoiceInterface {
    const invoice = this.invoices.get(id);

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  create(fields: Omit<InvoiceInterface, 'id'>): InvoiceInterface {
    const invoice = { ...fields, id: randomUUID() };
    this.invoices = new Map(this.invoices).set(invoice.id, invoice);
    return invoice;
  }

  update(id: string, changes: Partial<InvoiceInterface>): InvoiceInterface {
    const invoice = { ...this.find(id), ...changes, id };
    this.invoices = new Map(this.invoices).set(id, invoice);
    return invoice;
  }

  remove(id: string): void {
    this.find(id);
    const invoices = new Map(this.invoices);
    invoices.delete(id);
    this.invoices = invoices;
  }
}

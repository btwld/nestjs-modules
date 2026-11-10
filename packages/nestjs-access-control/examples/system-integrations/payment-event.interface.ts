import { type InvoiceInterface } from './invoice.interface.js';

export interface PaymentEventInterface {
  invoiceId: string;
  changes: Partial<InvoiceInterface>;
}

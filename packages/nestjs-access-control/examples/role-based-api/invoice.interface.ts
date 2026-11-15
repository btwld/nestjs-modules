export interface InvoiceInterface {
  id: string;
  customer: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  internalNotes: string;
}

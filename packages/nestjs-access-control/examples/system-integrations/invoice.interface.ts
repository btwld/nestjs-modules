export interface InvoiceInterface {
  id: string;
  amount: number;
  status: 'sent' | 'paid';
  paidAt: string | null;
}

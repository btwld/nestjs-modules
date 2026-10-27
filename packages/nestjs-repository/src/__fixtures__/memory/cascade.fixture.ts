import { Injectable } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RowScopeBase } from '../../row-scope/row-scope-base.js';

import { type TenantScopeFixture } from './order-row-scope.fixture.js';

export const INVOICE_TOKEN = 'invoices';
export const INVOICE_LINE_TOKEN = 'invoice-lines';
export const LINE_NOTE_TOKEN = 'line-notes';
export const RECEIPT_TOKEN = 'receipts';
export const PAYMENT_TOKEN = 'payments';
export const REFUND_TOKEN = 'refunds';

/** An invoice: scoped, soft deleted, with lines, a receipt and refunds. */
export interface InvoiceFixture {
  id: string;
  tenantId: string;
  number: string;
  dateDeleted?: Date | null;
  lines?: InvoiceLineFixture[];
  receipt?: ReceiptFixture | null;
  refunds?: RefundFixture[];
}

export class InvoiceEntityFixture implements InvoiceFixture {
  declare id: string;
  declare tenantId: string;
  declare number: string;
  declare dateDeleted?: Date | null;
  declare lines?: InvoiceLineFixture[];
  declare receipt?: ReceiptFixture | null;
  declare refunds?: RefundFixture[];
}

export interface InvoiceLineFixture {
  id: string;
  tenantId: string;
  invoiceId: string;
  sku: string;
  dateDeleted?: Date | null;
  invoice?: InvoiceFixture;
  notes?: LineNoteFixture[];
}

export class InvoiceLineEntityFixture implements InvoiceLineFixture {
  declare id: string;
  declare tenantId: string;
  declare invoiceId: string;
  declare sku: string;
  declare dateDeleted?: Date | null;
  declare invoice?: InvoiceFixture;
  declare notes?: LineNoteFixture[];
}

export interface LineNoteFixture {
  id: string;
  tenantId: string;
  lineId: string;
  text: string;
  dateDeleted?: Date | null;
}

export class LineNoteEntityFixture implements LineNoteFixture {
  declare id: string;
  declare tenantId: string;
  declare lineId: string;
  declare text: string;
  declare dateDeleted?: Date | null;
}

export interface ReceiptFixture {
  id: string;
  tenantId: string;
  invoiceId: string;
  total: number;
  dateDeleted?: Date | null;
}

export class ReceiptEntityFixture implements ReceiptFixture {
  declare id: string;
  declare tenantId: string;
  declare invoiceId: string;
  declare total: number;
  declare dateDeleted?: Date | null;
}

/** A payment: unscoped, never soft deleted, with refunds. */
export interface PaymentFixture {
  id: string;
  amount: number;
  refunds?: RefundFixture[];
}

export class PaymentEntityFixture implements PaymentFixture {
  declare id: string;
  declare amount: number;
  declare refunds?: RefundFixture[];
}

export interface RefundFixture {
  id: string;
  paymentId?: string | null;
  invoiceId?: string | null;
  amount: number;
}

export class RefundEntityFixture implements RefundFixture {
  declare id: string;
  declare paymentId?: string | null;
  declare invoiceId?: string | null;
  declare amount: number;
}

const column = (
  name: string,
  flags: Partial<RepositoryColumnMetadataInterface> = {},
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary: false,
  isVersion: false,
  isRemoveDate: false,
  ...flags,
});

const id = column('id', { isPrimary: true });
const dateDeleted = column('dateDeleted', { isRemoveDate: true });

const INVOICE_COLUMNS = [id, column('tenantId'), column('number'), dateDeleted];
const LINE_COLUMNS = [
  id,
  column('tenantId'),
  column('invoiceId'),
  column('sku'),
  dateDeleted,
];
const NOTE_COLUMNS = [
  id,
  column('tenantId'),
  column('lineId'),
  column('text'),
  dateDeleted,
];
const RECEIPT_COLUMNS = [
  id,
  column('tenantId'),
  column('invoiceId'),
  column('total'),
  dateDeleted,
];
const PAYMENT_COLUMNS = [id, column('amount')];
const REFUND_COLUMNS = [
  id,
  column('paymentId'),
  column('invoiceId'),
  column('amount'),
];

export const INVOICE_METADATA: RepositoryMetadataInterface<InvoiceFixture> = {
  name: 'Invoice',
  type: InvoiceEntityFixture,
  urn: 'urn:memory:Invoice',
  columns: INVOICE_COLUMNS,
  relations: [
    {
      name: 'lines',
      targetEntity: 'InvoiceLine',
      targetUrn: 'urn:memory:InvoiceLine',
      targetColumns: LINE_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'invoiceId' },
    },
    {
      name: 'receipt',
      targetEntity: 'Receipt',
      targetUrn: 'urn:memory:Receipt',
      targetColumns: RECEIPT_COLUMNS,
      cardinality: 'one',
      on: { from: 'id', to: 'invoiceId' },
    },
    {
      // Refunds are never soft deleted, so they cannot follow an invoice.
      name: 'refunds',
      targetEntity: 'Refund',
      targetUrn: 'urn:memory:Refund',
      targetColumns: REFUND_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'invoiceId' },
    },
    {
      // Joined on a column that is not the invoice's key.
      name: 'refundsByNumber',
      targetEntity: 'Refund',
      targetUrn: 'urn:memory:Refund',
      targetColumns: REFUND_COLUMNS,
      cardinality: 'many',
      on: { from: 'number', to: 'invoiceId' },
    },
  ],
};

export const INVOICE_LINE_METADATA: RepositoryMetadataInterface<InvoiceLineFixture> =
  {
    name: 'InvoiceLine',
    type: InvoiceLineEntityFixture,
    urn: 'urn:memory:InvoiceLine',
    columns: LINE_COLUMNS,
    relations: [
      {
        name: 'invoice',
        targetEntity: 'Invoice',
        targetUrn: 'urn:memory:Invoice',
        targetColumns: INVOICE_COLUMNS,
        cardinality: 'one',
        on: { from: 'invoiceId', to: 'id' },
        foreignKey: [{ from: 'invoiceId', to: 'id' }],
      },
      {
        name: 'notes',
        targetEntity: 'LineNote',
        targetUrn: 'urn:memory:LineNote',
        targetColumns: NOTE_COLUMNS,
        cardinality: 'many',
        on: { from: 'id', to: 'lineId' },
      },
    ],
  };

export const LINE_NOTE_METADATA: RepositoryMetadataInterface<LineNoteFixture> =
  {
    name: 'LineNote',
    type: LineNoteEntityFixture,
    urn: 'urn:memory:LineNote',
    columns: NOTE_COLUMNS,
    relations: [],
  };

export const RECEIPT_METADATA: RepositoryMetadataInterface<ReceiptFixture> = {
  name: 'Receipt',
  type: ReceiptEntityFixture,
  urn: 'urn:memory:Receipt',
  columns: RECEIPT_COLUMNS,
  relations: [],
};

export const PAYMENT_METADATA: RepositoryMetadataInterface<PaymentFixture> = {
  name: 'Payment',
  type: PaymentEntityFixture,
  urn: 'urn:memory:Payment',
  columns: PAYMENT_COLUMNS,
  relations: [
    {
      name: 'refunds',
      targetEntity: 'Refund',
      targetUrn: 'urn:memory:Refund',
      targetColumns: REFUND_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'paymentId' },
    },
  ],
};

export const REFUND_METADATA: RepositoryMetadataInterface<RefundFixture> = {
  name: 'Refund',
  type: RefundEntityFixture,
  urn: 'urn:memory:Refund',
  columns: REFUND_COLUMNS,
  relations: [],
};

export const BUNDLE_TOKEN = 'bundles';
export const CATEGORY_TOKEN = 'categories';

/** A bundle, keyed by two columns, with refunds joined on one of them. */
export interface BundleFixture {
  id: string;
  region: string;
}

export class BundleEntityFixture implements BundleFixture {
  declare id: string;
  declare region: string;
}

export const BUNDLE_METADATA: RepositoryMetadataInterface<BundleFixture> = {
  name: 'Bundle',
  type: BundleEntityFixture,
  urn: 'urn:memory:Bundle',
  columns: [id, column('region', { isPrimary: true })],
  relations: [
    {
      name: 'refunds',
      targetEntity: 'Refund',
      targetUrn: 'urn:memory:Refund',
      targetColumns: REFUND_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'paymentId' },
    },
  ],
};

/** A category, with child categories. */
export interface CategoryFixture {
  id: string;
  parentId?: string | null;
}

export class CategoryEntityFixture implements CategoryFixture {
  declare id: string;
  declare parentId?: string | null;
}

const CATEGORY_COLUMNS = [id, column('parentId')];

export const CATEGORY_METADATA: RepositoryMetadataInterface<CategoryFixture> = {
  name: 'Category',
  type: CategoryEntityFixture,
  urn: 'urn:memory:Category',
  columns: CATEGORY_COLUMNS,
  relations: [
    {
      name: 'children',
      targetEntity: 'Category',
      targetUrn: 'urn:memory:Category',
      targetColumns: CATEGORY_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'parentId' },
    },
  ],
};

/** One resolver for every scoped entity in this fixture. */
@Injectable()
export class TenantRowScopeFixture extends RowScopeBase<TenantScopeFixture> {
  constructor() {
    super({ scope: ['tenantId'] });
  }
}

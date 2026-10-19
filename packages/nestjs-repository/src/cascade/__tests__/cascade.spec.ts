import { HttpStatus, Module, type PlainLiteralObject } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost } from '@concepta/nestjs-core';

import {
  BUNDLE_TOKEN,
  BundleEntityFixture,
  CATEGORY_TOKEN,
  CategoryEntityFixture,
  INVOICE_LINE_TOKEN,
  INVOICE_TOKEN,
  InvoiceEntityFixture,
  type InvoiceFixture,
  InvoiceLineEntityFixture,
  type InvoiceLineFixture,
  InvoiceLineRowScopeFixture,
  InvoiceRowScopeFixture,
  LINE_NOTE_TOKEN,
  LineNoteEntityFixture,
  type LineNoteFixture,
  LineNoteRowScopeFixture,
  PAYMENT_TOKEN,
  PaymentEntityFixture,
  type PaymentFixture,
  RECEIPT_TOKEN,
  ReceiptEntityFixture,
  type ReceiptFixture,
  ReceiptRowScopeFixture,
  REFUND_TOKEN,
  RefundEntityFixture,
} from '../../__fixtures__/memory/cascade.fixture.js';
import {
  AUTHOR_TAG_TOKEN,
  AUTHOR_TOKEN,
  AuthorEntityFixture,
  AuthorTagEntityFixture,
  TAG_TOKEN,
  TagEntityFixture,
} from '../../__fixtures__/memory/federation.fixture.js';
import { type MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { type TenantScopeFixture } from '../../__fixtures__/memory/order-row-scope.fixture.js';
import { CascadeWriteException } from '../../exceptions/cascade-write.exception.js';
import { EntityAlreadyExistsException } from '../../exceptions/entity-already-exists.exception.js';
import { PrimaryKeyImmutableException } from '../../exceptions/primary-key-immutable.exception.js';
import { RelationWriteException } from '../../exceptions/relation-write.exception.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { RepositoryModule } from '../../repository.module.js';
import { RowScopeCtx } from '../../row-scope/interfaces/row-scope-context.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';

const ctxFor = (scope: TenantScopeFixture): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, scope, { immutable: true });
  return ctx;
};

const ACME = ctxFor({ tenantId: 'acme' });
const GLOBEX = ctxFor({ tenantId: 'globex' });

@Module({
  imports: [
    RepositoryModule.forFeature([
      INVOICE_TOKEN,
      INVOICE_LINE_TOKEN,
      LINE_NOTE_TOKEN,
      RECEIPT_TOKEN,
    ]),
  ],
  providers: [
    InvoiceRowScopeFixture,
    InvoiceLineRowScopeFixture,
    LineNoteRowScopeFixture,
    ReceiptRowScopeFixture,
  ],
  exports: [
    InvoiceRowScopeFixture,
    InvoiceLineRowScopeFixture,
    LineNoteRowScopeFixture,
    ReceiptRowScopeFixture,
  ],
})
class ResolverModule {}

const INVOICES: RepositoryProviderOptions = {
  key: INVOICE_TOKEN,
  entity: InvoiceEntityFixture,
  rowScope: { access: 'scoped', resolver: InvoiceRowScopeFixture },
  relations: { lines: { cascade: true }, receipt: { cascade: true } },
};

const LINES: RepositoryProviderOptions = {
  key: INVOICE_LINE_TOKEN,
  entity: InvoiceLineEntityFixture,
  rowScope: { access: 'scoped', resolver: InvoiceLineRowScopeFixture },
  relations: { notes: { cascade: true } },
};

const NOTES: RepositoryProviderOptions = {
  key: LINE_NOTE_TOKEN,
  entity: LineNoteEntityFixture,
  rowScope: { access: 'scoped', resolver: LineNoteRowScopeFixture },
};

const RECEIPTS: RepositoryProviderOptions = {
  key: RECEIPT_TOKEN,
  entity: ReceiptEntityFixture,
  rowScope: { access: 'scoped', resolver: ReceiptRowScopeFixture },
};

function compile(
  entities: RepositoryProviderOptions[],
  withResolvers = true,
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      RepositoryModule.forRoot({
        imports: withResolvers ? [ResolverModule] : [],
        drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
      }),
    ],
  }).compile();
}

describe('cascading writes', () => {
  let moduleRef: TestingModule;
  let invoices: MemoryRepositoryFixture<InvoiceFixture>;
  let lines: MemoryRepositoryFixture<InvoiceLineFixture>;
  let notes: MemoryRepositoryFixture<LineNoteFixture>;
  let receipts: MemoryRepositoryFixture<ReceiptFixture>;

  beforeEach(async () => {
    moduleRef = await compile([INVOICES, LINES, NOTES, RECEIPTS]);
    await moduleRef.init();
    invoices = moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));
    lines = moduleRef.get(getDynamicRepositoryToken(INVOICE_LINE_TOKEN));
    notes = moduleRef.get(getDynamicRepositoryToken(LINE_NOTE_TOKEN));
    receipts = moduleRef.get(getDynamicRepositoryToken(RECEIPT_TOKEN));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const skus = () => lines.stored.map(({ sku }) => sku);

  /** An ACME invoice with two lines, a note on the first, and a receipt. */
  const seed = () =>
    invoices.create(
      {
        number: 'A-1',
        lines: [
          { sku: 'widget', notes: [{ text: 'fragile' }] },
          { sku: 'gear' },
        ],
        receipt: { total: 10 },
      },
      { ctx: ACME },
    );

  describe('create', () => {
    it('writes each related row through its own repository', async () => {
      const invoice = await seed();
      const [widget, gear] = invoice.lines ?? [];

      expect(invoice).toEqual({
        id: invoice.id,
        tenantId: 'acme',
        number: 'A-1',
        lines: [
          {
            id: widget?.id,
            tenantId: 'acme',
            invoiceId: invoice.id,
            sku: 'widget',
            notes: [
              {
                id: widget?.notes?.[0]?.id,
                tenantId: 'acme',
                lineId: widget?.id,
                text: 'fragile',
              },
            ],
          },
          {
            id: gear?.id,
            tenantId: 'acme',
            invoiceId: invoice.id,
            sku: 'gear',
          },
        ],
        receipt: {
          id: invoice.receipt?.id,
          tenantId: 'acme',
          invoiceId: invoice.id,
          total: 10,
        },
      });
      expect(skus()).toEqual(['widget', 'gear']);
      expect(notes.stored).toHaveLength(1);
      expect(receipts.stored).toHaveLength(1);
    });

    it('sets the foreign key to the parent, whatever the payload held', async () => {
      const invoice = await invoices.create(
        { number: 'A-1', lines: [{ sku: 'widget', invoiceId: 'elsewhere' }] },
        { ctx: ACME },
      );

      expect(lines.stored.map(({ invoiceId }) => invoiceId)).toEqual([
        invoice.id,
      ]);
    });

    it("runs the related entity's own row scope", async () => {
      await expect(
        invoices.create(
          { number: 'A-1', lines: [{ sku: 'widget', tenantId: 'globex' }] },
          { ctx: ACME },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(lines.stored).toEqual([]);
    });

    it('writes each related row of every created parent', async () => {
      const created = await invoices.createMany(
        [
          { number: 'A-1', lines: [{ sku: 'widget' }] },
          { number: 'A-2', lines: [{ sku: 'gear' }] },
        ],
        { ctx: ACME },
      );

      expect(
        lines.stored.map(({ invoiceId, sku }) => ({ invoiceId, sku })),
      ).toEqual([
        { invoiceId: created[0]?.id, sku: 'widget' },
        { invoiceId: created[1]?.id, sku: 'gear' },
      ]);
      expect(created.map((invoice) => invoice.lines?.length)).toEqual([1, 1]);
    });

    it.each([
      ['an object for a to-many relation', { lines: { sku: 'widget' } }],
      ['a list for a to-one relation', { receipt: [{ total: 1 }] }],
    ])('refuses %s', async (_name, payload) => {
      // As a request body would arrive: untyped.
      const untyped: MemoryRepositoryFixture<PlainLiteralObject> =
        moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));

      await expect(
        untyped.create({ number: 'A-1', ...payload }, { ctx: ACME }),
      ).rejects.toThrow(CascadeWriteException);
    });

    it('still refuses a relation that does not cascade', async () => {
      await expect(
        lines.create(
          { sku: 'widget', invoice: { number: 'A-1' } },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RelationWriteException);

      expect(invoices.stored).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates listed rows, creates new ones, and leaves the rest', async () => {
      const invoice = await seed();
      const [widget] = invoice.lines ?? [];

      const updated = await invoices.update(
        invoice,
        { lines: [{ id: widget?.id, sku: 'widget-2' }, { sku: 'bolt' }] },
        { ctx: ACME },
      );

      expect(skus()).toEqual(['widget-2', 'gear', 'bolt']);
      expect(updated.lines?.map(({ sku }) => sku)).toEqual([
        'widget-2',
        'bolt',
      ]);
    });

    it('leaves related rows alone when the payload does not name them', async () => {
      const invoice = await seed();

      await invoices.update(invoice, { number: 'A-2' }, { ctx: ACME });

      expect(skus()).toEqual(['widget', 'gear']);
    });

    it("refuses to take another invoice's line", async () => {
      const invoice = await seed();
      const other = await invoices.create(
        { number: 'A-2', lines: [{ sku: 'nut' }] },
        { ctx: ACME },
      );
      const nut = other.lines?.[0];

      await expect(
        invoices.update(
          invoice,
          { lines: [{ id: nut?.id, sku: 'nut' }] },
          { ctx: ACME },
        ),
      ).rejects.toThrow(EntityAlreadyExistsException);

      expect(lines.stored.find(({ id }) => id === nut?.id)?.invoiceId).toBe(
        other.id,
      );
    });

    it('updates the one to-one related row the payload names without a key', async () => {
      const invoice = await seed();

      await invoices.update(invoice, { receipt: { total: 20 } }, { ctx: ACME });

      expect(
        receipts.stored.map(({ id: receiptId, total }) => ({
          id: receiptId,
          total,
        })),
      ).toEqual([{ id: invoice.receipt?.id, total: 20 }]);
    });

    it('refuses a to-one payload naming a different row', async () => {
      const invoice = await seed();

      await expect(
        invoices.update(
          invoice,
          { receipt: { id: 'fresh', total: 20 } },
          { ctx: ACME },
        ),
      ).rejects.toThrow(PrimaryKeyImmutableException);

      expect(receipts.stored.map(({ total }) => total)).toEqual([10]);
    });

    it('deletes a to-one related row set to null', async () => {
      const invoice = await seed();

      await invoices.update(invoice, { receipt: null }, { ctx: ACME });

      expect(receipts.stored).toEqual([]);
    });

    it('refuses a to-one relation that has more than one stored row', async () => {
      const invoice = await seed();
      await receipts.create(
        { invoiceId: invoice.id, total: 11 },
        { ctx: ACME },
      );

      await expect(
        invoices.update(invoice, { receipt: { total: 20 } }, { ctx: ACME }),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.CONFLICT });

      expect(receipts.stored.map(({ total }) => total)).toEqual([10, 11]);
    });
  });

  describe('replace', () => {
    it('also deletes the related rows the payload leaves out', async () => {
      const invoice = await seed();
      const [widget] = invoice.lines ?? [];

      await invoices.replace(
        invoice,
        { number: 'A-1', lines: [{ id: widget?.id, sku: 'widget' }] },
        { ctx: ACME },
      );

      expect(skus()).toEqual(['widget']);
    });

    it('deletes a to-one related row replaced with null', async () => {
      const invoice = await seed();

      await invoices.replace(
        invoice,
        { number: 'A-1', receipt: null },
        { ctx: ACME },
      );

      expect(receipts.stored).toEqual([]);
    });

    it('keeps the to-one related row it names without a key', async () => {
      const invoice = await seed();

      await invoices.replace(
        invoice,
        { number: 'A-1', receipt: { total: 20 } },
        { ctx: ACME },
      );

      expect(receipts.stored.map(({ id: receiptId }) => receiptId)).toEqual([
        invoice.receipt?.id,
      ]);
    });
  });

  it('keeps the entity type on a result holding related rows', async () => {
    expect(await seed()).toBeInstanceOf(InvoiceEntityFixture);
  });

  it('replaces the related rows on an upsert onto a stored row', async () => {
    const invoice = await seed();

    await invoices.upsert(
      { id: invoice.id, number: 'A-1', lines: [{ sku: 'bolt' }] },
      { ctx: ACME },
    );

    expect(skus()).toEqual(['bolt']);
  });

  describe('delete', () => {
    it('deletes related rows first, at every depth', async () => {
      const invoice = await seed();

      await invoices.delete(invoice, { ctx: ACME });

      expect(invoices.stored).toEqual([]);
      expect(lines.stored).toEqual([]);
      expect(notes.stored).toEqual([]);
      expect(receipts.stored).toEqual([]);
    });

    it('deletes the related rows of every deleted parent', async () => {
      const invoice = await seed();

      await invoices.deleteMany([invoice], { ctx: ACME });

      expect(lines.stored).toEqual([]);
      expect(notes.stored).toEqual([]);
    });

    it("touches nothing of another tenant's invoice", async () => {
      const invoice = await seed();

      await expect(
        invoices.delete(invoice, { ctx: GLOBEX }),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.NOT_FOUND });

      expect(skus()).toEqual(['widget', 'gear']);
      expect(notes.stored).toHaveLength(1);
    });
  });

  it('soft deletes and restores related rows at every depth', async () => {
    const invoice = await seed();

    await invoices.softDelete(invoice, { ctx: ACME });

    expect(await lines.count({ ctx: ACME })).toBe(0);
    expect(await notes.count({ ctx: ACME })).toBe(0);
    expect(await receipts.count({ ctx: ACME })).toBe(0);

    const [deleted] = await invoices.find({ withDeleted: true, ctx: ACME });
    await invoices.restore(deleted, { ctx: ACME });

    expect(await lines.count({ ctx: ACME })).toBe(2);
    expect(await notes.count({ ctx: ACME })).toBe(1);
    expect(await receipts.count({ ctx: ACME })).toBe(1);
  });
});

describe('cascading into an unscoped entity', () => {
  let moduleRef: TestingModule;
  let invoices: MemoryRepositoryFixture<InvoiceFixture>;
  let receipts: MemoryRepositoryFixture<ReceiptFixture>;

  beforeEach(async () => {
    moduleRef = await compile([
      INVOICES,
      LINES,
      NOTES,
      { key: RECEIPT_TOKEN, entity: ReceiptEntityFixture },
    ]);
    await moduleRef.init();
    invoices = moduleRef.get(getDynamicRepositoryToken(INVOICE_TOKEN));
    receipts = moduleRef.get(getDynamicRepositoryToken(RECEIPT_TOKEN));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  // Nothing scopes the receipts, so only the invoice's own scope check keeps
  // another tenant from reaching them.
  it.each(['delete', 'softDelete'] as const)(
    "%s touches nothing of another tenant's invoice",
    async (operation) => {
      const invoice = await invoices.create(
        { number: 'A-1', receipt: { total: 10 } },
        { ctx: ACME },
      );

      await expect(
        invoices[operation](invoice, { ctx: GLOBEX }),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.NOT_FOUND });

      expect(receipts.stored.map(({ dateDeleted }) => dateDeleted)).toEqual([
        undefined,
      ]);
    },
  );
});

describe('cascade startup checks', () => {
  const refuses = (entities: RepositoryProviderOptions[], message: string) =>
    expect(compile(entities)).rejects.toThrow(message);

  it('refuses a relation whose foreign key the entity holds', async () => {
    await refuses(
      [
        INVOICES,
        { ...LINES, relations: { invoice: { cascade: true } } },
        NOTES,
        RECEIPTS,
      ],
      '"invoice-lines" relation "invoice" cannot cascade: InvoiceLine holds ' +
        'its foreign key, and a write never changes the row it points to.',
    );
  });

  it('refuses a many-to-many relation', async () => {
    await expect(
      compile(
        [
          {
            key: AUTHOR_TOKEN,
            entity: AuthorEntityFixture,
            relations: { tags: { cascade: true } },
          },
          { key: TAG_TOKEN, entity: TagEntityFixture },
          { key: AUTHOR_TAG_TOKEN, entity: AuthorTagEntityFixture },
        ],
        false,
      ),
    ).rejects.toThrow(
      '"authors" relation "tags" cannot cascade: it is many-to-many. Write ' +
        'its junction rows through their own repository.',
    );
  });

  it('refuses a relation that is also federated', async () => {
    await refuses(
      [
        {
          ...INVOICES,
          relations: { lines: { cascade: true, federated: true } },
        },
        LINES,
        NOTES,
        RECEIPTS,
      ],
      '"invoices" relation "lines" cannot be both federated and cascade.',
    );
  });

  it('refuses a relation whose rows are not registered', async () => {
    await refuses(
      [INVOICES, LINES, NOTES],
      '"invoices" relation "receipt" cascades, but no repository for Receipt ' +
        'is registered in forRoot().',
    );
  });

  it("refuses a relation joined on something other than the entity's key", async () => {
    await refuses(
      [
        { ...INVOICES, relations: { refundsByNumber: { cascade: true } } },
        LINES,
        NOTES,
        RECEIPTS,
        { key: REFUND_TOKEN, entity: RefundEntityFixture },
      ],
      '"invoices" relation "refundsByNumber" cannot cascade: it is joined on ' +
        '"number", and only a join on Invoice\'s single primary key column ' +
        'identifies its rows.',
    );
  });

  it('refuses a relation joined on one column of a composite key', async () => {
    await expect(
      compile(
        [
          {
            key: BUNDLE_TOKEN,
            entity: BundleEntityFixture,
            relations: { refunds: { cascade: true } },
          },
          { key: REFUND_TOKEN, entity: RefundEntityFixture },
        ],
        false,
      ),
    ).rejects.toThrow(
      '"bundles" relation "refunds" cannot cascade: it is joined on "id", ' +
        "and only a join on Bundle's single primary key column identifies " +
        'its rows.',
    );
  });

  it('refuses cascade relations that lead back to where they started', async () => {
    await expect(
      compile(
        [
          {
            key: CATEGORY_TOKEN,
            entity: CategoryEntityFixture,
            relations: { children: { cascade: true } },
          },
        ],
        false,
      ),
    ).rejects.toThrow(
      'Cascade relations form a cycle: "categories".children → ' +
        '"categories". Remove cascade from one of them.',
    );
  });

  it('refuses a soft-deleted entity cascading to rows without a delete date', async () => {
    await refuses(
      [
        { ...INVOICES, relations: { refunds: { cascade: true } } },
        LINES,
        NOTES,
        RECEIPTS,
        { key: REFUND_TOKEN, entity: RefundEntityFixture },
      ],
      '"invoices" relation "refunds" cannot cascade: Invoice is soft ' +
        'deleted, and Refund has no delete date column.',
    );
  });

  describe('into append-only rows', () => {
    const payments = (appendOnly: boolean): RepositoryProviderOptions => ({
      key: PAYMENT_TOKEN,
      entity: PaymentEntityFixture,
      relations: { refunds: { cascade: true } },
      ...(appendOnly
        ? { writePolicy: { access: 'append-only', reason: 'ledger' } }
        : {}),
    });
    const refunds: RepositoryProviderOptions = {
      key: REFUND_TOKEN,
      entity: RefundEntityFixture,
      writePolicy: { access: 'append-only', reason: 'ledger' },
    };

    it('is refused from an entity that can change', async () => {
      await expect(compile([payments(false), refunds], false)).rejects.toThrow(
        '"payments" relation "refunds" cascades into append-only Refund, so ' +
          'an update or delete of Payment could not reach it. Remove cascade, ' +
          'or make "payments" append-only too.',
      );
    });

    it('is allowed from an append-only entity, whose creates cascade', async () => {
      const moduleRef = await compile([payments(true), refunds], false);
      await moduleRef.init();
      const repo: MemoryRepositoryFixture<PaymentFixture> = moduleRef.get(
        getDynamicRepositoryToken(PAYMENT_TOKEN),
      );

      const payment = await repo.create({
        amount: 5,
        refunds: [{ amount: 1 }],
      });
      await moduleRef.close();

      expect(payment.refunds?.map(({ amount }) => amount)).toEqual([1]);
    });
  });
});

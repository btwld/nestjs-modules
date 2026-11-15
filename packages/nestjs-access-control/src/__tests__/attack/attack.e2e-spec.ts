import request from 'supertest';

import {
  Controller,
  Get,
  type INestApplication,
  type PlainLiteralObject,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import {
  IssueAccessTokenCommand,
  IssueRefreshTokenCommand,
} from '@concepta/nestjs-authentication';
import {
  ActorCtx,
  type Actor,
  AppContextHost,
  RouteAuditFailedException,
} from '@concepta/nestjs-core';
import {
  AuthorityRefusedException,
  getDynamicRepositoryToken,
  type RepositoryInterface,
  RowScopeCtx,
  Where,
} from '@concepta/nestjs-repository';

import { AccessRefusedException } from '../../domain/exceptions/access-refused.exception.js';

import { AttackUserStore } from './attack-user.store.js';
import {
  type AttackCustomerEntity,
  type AttackInvoiceLineEntity,
} from './attack.entities.js';
import { AttackModule } from './attack.module.js';
import { CUSTOMER, INVOICE_LINE } from './attack.rules.js';

/** A context acting as `actor` in `tenantId`, for checking what is stored. */
function storedAs(actor: Actor, tenantId?: string): AppContextHost {
  const ctx = new AppContextHost();
  ctx.defineOverlay(ActorCtx, actor, { immutable: true });
  if (tenantId) {
    ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
  }
  return ctx;
}

function base64url(value: PlainLiteralObject): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('Attack round: one application, every layer', () => {
  let app: INestApplication;
  let users: AttackUserStore;
  let customer: AttackCustomerEntity;
  let acmeId: string;
  let globexId: string;
  let globexLineId: string;
  const tokens = new Map<string, string>();

  const http = () => request(app.getHttpServer());

  /** Every exception the application rendered, newest last. */
  const rendered = vi.spyOn(BaseExceptionFilter.prototype, 'catch');

  /**
   * Why the last call was refused, from the context of the exception it was
   * rendered from: the response never shows it.
   */
  const lastRefusal = () => {
    const [exception] = rendered.mock.calls.at(-1) ?? [];
    return exception instanceof AccessRefusedException
      ? exception.context.refusal
      : undefined;
  };

  /**
   * The exception `call` was rendered from, its own only: what earlier
   * calls rendered is cleared first.
   */
  const renderedBy = async (call: () => PromiseLike<unknown>) => {
    rendered.mockClear();
    await call();
    const [exception] = rendered.mock.calls.at(-1) ?? [];
    return exception;
  };

  const issue = (sub: string): Promise<string> =>
    app.get(CommandBus).execute(new IssueAccessTokenCommand({}, { sub }));

  const as = (user: string) => ({
    Authorization: `Bearer ${tokens.get(user) ?? 'missing'}`,
  });

  const invoice = (overrides: PlainLiteralObject = {}) => ({
    number: 'A-2',
    amount: 300,
    customerId: customer.id,
    ...overrides,
  });

  /** What a clerk may see of the seeded acme invoice. */
  const clerkView = () => ({
    id: acmeId,
    tenantId: 'acme',
    number: 'A-1',
    amount: 1200,
    customerId: customer.id,
    deletedAt: null,
  });

  /** The seeded acme invoice, as a manager reads it. */
  const managerRead = async (id = acmeId) =>
    (await http().get(`/invoices/${id}`).set(as('grace')).expect(200)).body;

  /** How many acme invoices a manager sees. */
  const acmeCount = async () =>
    (await http().get('/invoices').set(as('grace')).expect(200)).body.total;

  /** Every line in globex, as a globex manager reads them. */
  const globexLines = (): Promise<AttackInvoiceLineEntity[]> =>
    app
      .get<RepositoryInterface<AttackInvoiceLineEntity>>(
        getDynamicRepositoryToken(INVOICE_LINE),
      )
      .find({
        ctx: storedAs(
          { kind: 'role', roles: ['manager'], userId: 'gus' },
          'globex',
        ),
      });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AttackModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Boots with the route audit on: an open route would fail this.
    await app.init();

    users = app.get(AttackUserStore);
    tokens.clear();
    for (const user of [
      'alice',
      'grace',
      'sam',
      'jun',
      'ivy',
      'carl',
      'rita',
      'cora',
      'bill',
      'mallory',
      'gus',
      'ian',
    ]) {
      tokens.set(user, await issue(user));
    }

    customer = await app
      .get<RepositoryInterface<AttackCustomerEntity>>(
        getDynamicRepositoryToken(CUSTOMER),
      )
      .create(
        { name: 'Initech', creditLimit: 50000 },
        { ctx: storedAs({ kind: 'system', name: 'seeder' }) },
      );

    acmeId = (
      await http()
        .post('/invoices')
        .set(as('grace'))
        .send(
          invoice({
            number: 'A-1',
            amount: 1200,
            internalNotes: 'slow payer',
            lines: [{ sku: 'widget', amount: 1200 }],
          }),
        )
        .expect(201)
    ).body.id;

    const globex = await http()
      .post('/invoices')
      .set(as('gus'))
      .send(
        invoice({
          number: 'G-1',
          amount: 900,
          internalNotes: 'globex secret',
          lines: [{ sku: 'gizmo', amount: 900 }],
        }),
      )
      .expect(201);
    globexId = globex.body.id;
    globexLineId = globex.body.lines[0].id;
  });

  afterEach(() => app.close());

  describe('A. authentication', () => {
    it('refuses a guarded route without a token', async () => {
      await http().get('/invoices').expect(401);
    });

    it("refuses an inactive user's valid token", async () => {
      await http().get('/invoices').set(as('ian')).expect(401);
    });

    it('refuses a token as soon as its user is turned off', async () => {
      await http().get(`/invoices/${acmeId}`).set(as('alice')).expect(200);
      users.update('alice', { active: false });
      await http().get(`/invoices/${acmeId}`).set(as('alice')).expect(401);
    });

    it('refuses a token for a user that never existed', async () => {
      await http()
        .get('/invoices')
        .set({ Authorization: `Bearer ${await issue('ghost')}` })
        .expect(401);
    });

    it('refuses a token for a user that was removed', async () => {
      users.remove('carl');
      await http().get('/invoices').set(as('carl')).expect(401);
    });

    it('refuses malformed and forged tokens', async () => {
      const [header, , signature] = (tokens.get('alice') ?? '').split('.');
      const resigned = `${header}.${base64url({ sub: 'grace' })}.${signature}`;
      const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: 'grace' })}.`;
      const refresh: string = await app
        .get(CommandBus)
        .execute(new IssueRefreshTokenCommand({}, { sub: 'grace' }));

      for (const token of ['not-a-jwt', 'a.b.c', resigned, unsigned, refresh]) {
        await http()
          .get('/invoices')
          .set({ Authorization: `Bearer ${token}` })
          .expect(401);
      }
    });

    it('serves the public health route without a token, or with a bad one', async () => {
      await http().get('/health').expect(200, { status: 'ok' });
      await http()
        .get('/health')
        .set({ Authorization: 'Bearer junk' })
        .expect(200, { status: 'ok' });
    });
  });

  describe('B. route layer', () => {
    it('refuses what the shared rules refuse, before the handler runs', async () => {
      const refused = await http()
        .delete(`/invoices/${acmeId}`)
        .set(as('alice'))
        .expect(403);

      expect(refused.body.message).toEqual('Not allowed to delete invoice');
      expect(lastRefusal()).toEqual('authority');
      expect(await managerRead()).toEqual({
        ...clerkView(),
        internalNotes: 'slow payer',
      });
    });

    it("this API's deny on amount holds on every route that writes it", async () => {
      await http()
        .patch(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send({ amount: 1 })
        .expect(403);
      await http()
        .put(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send(invoice({ number: 'A-1', amount: 1 }))
        .expect(403);
      await http()
        .put(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send(invoice({ number: 'A-1', amount: 1200 }))
        .expect(403);

      expect((await managerRead()).amount).toEqual(1200);

      // What the deny leaves alone still goes through.
      await http()
        .patch(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send({ number: 'A-1b' })
        .expect(200, { ...clerkView(), number: 'A-1b' });
    });

    it('an update by a role that may not read the delete date is refused, not failed', async () => {
      const exception = await renderedBy(() =>
        http()
          .patch(`/invoices/${acmeId}`)
          .set(as('rita'))
          .send({ number: 'A-1r' })
          .expect(403),
      );

      expect(exception).toBeInstanceOf(AuthorityRefusedException);
      expect(exception).toMatchObject({
        context: { action: 'read', columns: ['deletedAt'] },
      });
      expect((await managerRead()).number).toEqual('A-1');
    });

    it('a generated write by a role that may not read the invoice is refused at the read that finds it', async () => {
      for (const call of [
        () => http().patch(`/invoices/${acmeId}`).send({ number: 'A-1c' }),
        () => http().delete(`/invoices/${acmeId}`),
      ]) {
        const exception = await renderedBy(() =>
          call().set(as('cora')).expect(403),
        );

        expect(exception).toBeInstanceOf(AuthorityRefusedException);
        expect(exception).toMatchObject({
          context: { action: 'read', refusal: 'authority' },
        });
      }
      expect(await managerRead()).toEqual({
        ...clerkView(),
        internalNotes: 'slow payer',
      });
    });

    it("a route's customer is a column the write sets, which a biller may not", async () => {
      const created = await renderedBy(() =>
        http()
          .post(`/customers/${customer.id}/invoices`)
          .set(as('bill'))
          .send({ number: 'A-9', amount: 300 })
          .expect(403),
      );
      expect(created).toBeInstanceOf(AuthorityRefusedException);
      expect(created).toMatchObject({
        context: { action: 'create', columns: ['customerId'] },
      });

      const updated = await renderedBy(() =>
        http()
          .patch(`/customers/${customer.id}/invoices/${acmeId}`)
          .set(as('bill'))
          .send({ number: 'A-1c' })
          .expect(403),
      );
      expect(updated).toBeInstanceOf(AuthorityRefusedException);
      expect(updated).toMatchObject({
        context: { action: 'update', columns: ['customerId'] },
      });
      expect(await acmeCount()).toEqual(1);
      expect((await managerRead()).number).toEqual('A-1');

      // Without the route naming the customer, the same change goes through.
      await http()
        .patch(`/invoices/${acmeId}`)
        .set(as('bill'))
        .send({ number: 'A-1c' })
        .expect(200);
      expect((await managerRead()).number).toEqual('A-1c');
    });

    it("a write's query is the read that finds its row: a clerk may not filter it on the notes", async () => {
      const exception = await renderedBy(() =>
        http()
          .patch(
            `/invoices/${acmeId}?filter=${encodeURIComponent('internalNotes||$eq||slow payer')}`,
          )
          .set(as('alice'))
          .send({ number: 'A-1c' })
          .expect(403),
      );

      expect(exception).toBeInstanceOf(AuthorityRefusedException);
      expect(exception).toMatchObject({ context: { action: 'read' } });
      expect((await managerRead()).number).toEqual('A-1');
    });

    it('a route without a grant is decided for whoever signed in, and refused to nobody', async () => {
      await http()
        .get('/desk/invoices/open')
        .set(as('alice'))
        .expect(200, [clerkView()]);

      const exception = await renderedBy(() =>
        http().get('/desk/invoices/open').expect(403),
      );
      // No grant to check, so the repository refuses nobody acting.
      expect(exception).toBeInstanceOf(AuthorityRefusedException);
      expect(exception).toMatchObject({ context: { refusal: 'no-actor' } });
    });

    it('a create naming an existing invoice cannot overwrite its amount', async () => {
      const created = await http()
        .post('/desk/invoices')
        .set(as('alice'))
        .send({ ...invoice({ amount: 1 }), id: acmeId });

      expect(created.status).toBeGreaterThanOrEqual(400);
      expect(created.status).toBeLessThan(500);
      expect((await managerRead()).amount).toEqual(1200);
    });

    it('a resource the authority does not know is refused, whatever the grants allow', async () => {
      const refused = await http()
        .get('/desk/ledgers')
        .set(as('grace'))
        .expect(403);

      expect(refused.body.message).toEqual('Not allowed to read ledger');
      expect(lastRefusal()).toEqual('authority');
    });

    it("a resource in `except` is decided by access control's grants alone", async () => {
      await http()
        .get('/desk/reports/aging')
        .set(as('grace'))
        .expect(200, { buckets: [] });

      const refused = await http()
        .get('/desk/reports/aging')
        .set(as('alice'))
        .expect(403);
      expect(refused.body.message).toEqual('Not allowed to read report');
      expect(lastRefusal()).toEqual('no-grant');
    });
  });

  describe('C. data layer', () => {
    it('a clerk lists invoices without the notes', async () => {
      const listed = await http().get('/invoices').set(as('alice')).expect(200);
      expect(listed.body.data).toEqual([clerkView()]);
    });

    it('a clerk lists only the columns they select', async () => {
      const listed = await http()
        .get('/invoices?select=customerId')
        .set(as('alice'))
        .expect(200);
      expect(listed.body.data).toEqual([
        { id: acmeId, customerId: customer.id },
      ]);
    });

    it.each([
      { name: 'select', query: 'select=internalNotes' },
      { name: 'filter on', query: 'filter=internalNotes||$eq||slow payer' },
      { name: 'sort by', query: 'sort=internalNotes,ASC' },
    ])('a clerk may not $name the notes on a list', async ({ query }) => {
      await http().get(`/invoices?${query}`).set(as('alice')).expect(403);
    });

    it('a clerk reads an invoice without the notes', async () => {
      await http()
        .get(`/invoices/${acmeId}`)
        .set(as('alice'))
        .expect(200, clerkView());
    });

    it('a clerk joins each customer without its credit limit; collections see it', async () => {
      await http()
        .get('/desk/invoices')
        .set(as('alice'))
        .expect(200, [
          { ...clerkView(), customer: { id: customer.id, name: 'Initech' } },
        ]);

      const collected = await http()
        .get('/desk/invoices')
        .set(as('carl'))
        .expect(200);
      expect(collected.body).toEqual([
        {
          ...clerkView(),
          internalNotes: 'slow payer',
          customer: { id: customer.id, name: 'Initech', creditLimit: 50000 },
        },
      ]);
    });

    it("a clerk may not filter on a joined customer's credit limit, even in a route's own query", async () => {
      await http()
        .get('/desk/invoices/large-credit')
        .set(as('alice'))
        .expect(403);

      const collected = await http()
        .get('/desk/invoices/large-credit')
        .set(as('carl'))
        .expect(200);
      expect(collected.body).toHaveLength(1);
    });

    // The generated List route refuses a clerk whatever the query (see the
    // finding above), so these are made on Read, which a clerk passes
    // without them.
    it.each([
      { name: 'filter on', query: 'filter=internalNotes||$starts||slow' },
      { name: 'or-filter on', query: 'or=internalNotes||$starts||slow' },
      {
        name: 'search',
        query: `s=${encodeURIComponent('{"internalNotes":{"$starts":"slow"}}')}`,
      },
      {
        name: 'search, nested in $or,',
        query: `s=${encodeURIComponent(
          '{"$or":[{"number":"A-1"},{"internalNotes":{"$starts":"slow"}}]}',
        )}`,
      },
      {
        name: 'search, nested in $and,',
        query: `s=${encodeURIComponent(
          '{"number":"A-1","$and":[{"internalNotes":{"$contains":"payer"}}]}',
        )}`,
      },
    ])(
      'a clerk may not $name the notes: matching tells their value',
      async ({ query }) => {
        await http()
          .get(`/invoices/${acmeId}?${query}`)
          .set(as('alice'))
          .expect(403);
      },
    );

    it('a sort naming the notes on a read shows nothing more', async () => {
      await http()
        .get(`/invoices/${acmeId}?sort=internalNotes,ASC`)
        .set(as('alice'))
        .expect(200, clerkView());
    });

    it('a clerk may not select the notes on a read, as on a list', async () => {
      await http()
        .get(`/invoices/${acmeId}?select=id,internalNotes`)
        .set(as('alice'))
        .expect(403);
    });

    it('a manager may filter on the notes', async () => {
      const listed = await http()
        .get('/invoices?filter=internalNotes||$starts||slow')
        .set(as('grace'))
        .expect(200);
      expect(listed.body.total).toEqual(1);
    });

    it('a clerk may not write the notes on a create, and nothing is stored', async () => {
      await http()
        .post('/invoices')
        .set(as('alice'))
        .send(invoice({ internalNotes: 'mine' }))
        .expect(403);
      await http()
        .post('/desk/invoices')
        .set(as('alice'))
        .send(invoice({ internalNotes: 'mine' }))
        .expect(403);

      expect(await acmeCount()).toEqual(1);
    });

    it('a clerk may not write the notes in any item of a batch, and none is stored', async () => {
      await http()
        .post('/invoices/bulk')
        .set(as('alice'))
        .send({
          bulk: [invoice(), invoice({ number: 'A-3', internalNotes: 'mine' })],
        })
        .expect(403);

      expect(await acmeCount()).toEqual(1);
    });

    it('a clerk may not write the notes on an update or a replace', async () => {
      await http()
        .patch(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send({ internalNotes: 'mine' })
        .expect(403);
      await http()
        .put(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send(invoice({ number: 'A-1', amount: 1200, internalNotes: 'mine' }))
        .expect(403);

      expect((await managerRead()).internalNotes).toEqual('slow payer');
    });

    describe('row scope', () => {
      it("another tenant's clerk lists only their own tenant's invoices", async () => {
        await http()
          .get('/desk/invoices')
          .set(as('mallory'))
          .expect(200, [
            {
              id: globexId,
              tenantId: 'globex',
              number: 'G-1',
              amount: 900,
              customerId: customer.id,
              deletedAt: null,
              customer: { id: customer.id, name: 'Initech' },
            },
          ]);
      });

      it("another tenant's invoice is not found, on every route that names it", async () => {
        await http().get(`/invoices/${acmeId}`).set(as('mallory')).expect(404);
        await http()
          .patch(`/invoices/${acmeId}`)
          .set(as('mallory'))
          .send({ number: 'pwned' })
          .expect(404);
        await http()
          .put(`/invoices/${acmeId}`)
          .set(as('gus'))
          .send(invoice({ number: 'pwned', amount: 1 }))
          .expect(404);
        await http().delete(`/invoices/${acmeId}`).set(as('gus')).expect(404);
        await http()
          .delete(`/invoices/soft/${acmeId}`)
          .set(as('gus'))
          .expect(404);
        await http()
          .patch(`/invoices/restore/${acmeId}`)
          .set(as('gus'))
          .expect(404);

        expect(await managerRead()).toEqual({
          ...clerkView(),
          internalNotes: 'slow payer',
        });
      });

      it('a create naming another tenant is refused, not stored there or here', async () => {
        await http()
          .post('/invoices')
          .set(as('alice'))
          .send(invoice({ tenantId: 'globex' }))
          .expect(403);
        await http()
          .post('/invoices/bulk')
          .set(as('alice'))
          .send({ bulk: [invoice(), invoice({ tenantId: 'globex' })] })
          .expect(403);
        await http()
          .post('/invoices')
          .set(as('alice'))
          .send(
            invoice({ lines: [{ sku: 'x', amount: 1, tenantId: 'globex' }] }),
          )
          .expect(403);

        expect(await acmeCount()).toEqual(1);
        const globex = await http().get('/invoices').set(as('gus')).expect(200);
        expect(globex.body.total).toEqual(1);
        expect(await globexLines()).toHaveLength(1);
      });

      it("a cascaded line cannot be pointed at another tenant's invoice", async () => {
        const created = await http()
          .post('/desk/invoices')
          .set(as('alice'))
          .send(
            invoice({
              lines: [{ sku: 'stray', amount: 1, invoiceId: globexId }],
            }),
          )
          .expect(201);

        expect(created.body.lines).toEqual([
          expect.objectContaining({
            invoiceId: created.body.id,
            tenantId: 'acme',
          }),
        ]);
        expect(await globexLines()).toHaveLength(1);
      });

      it('an invoice cannot be moved to another tenant by an update', async () => {
        await http()
          .patch(`/invoices/${acmeId}`)
          .set(as('alice'))
          .send({ tenantId: 'globex' })
          .expect(403);

        expect((await managerRead()).tenantId).toEqual('acme');
      });

      it("an update cannot reach another tenant's line through the cascade", async () => {
        const response = await http()
          .patch(`/invoices/${acmeId}`)
          .set(as('alice'))
          .send({ lines: [{ id: globexLineId, sku: 'pwned', amount: 1 }] });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
        expect(await globexLines()).toEqual([
          expect.objectContaining({
            id: globexLineId,
            tenantId: 'globex',
            invoiceId: globexId,
            sku: 'gizmo',
            amount: 900,
          }),
        ]);
      });
    });

    describe('soft delete, delete and restore', () => {
      it('a role allowed to soft delete may not delete for good, nor restore', async () => {
        await http().delete(`/invoices/${acmeId}`).set(as('sam')).expect(403);
        await http()
          .delete(`/invoices/soft/${acmeId}`)
          .set(as('sam'))
          .expect(204);
        await http().get(`/invoices/${acmeId}`).set(as('grace')).expect(404);

        await http()
          .patch(`/invoices/restore/${acmeId}`)
          .set(as('sam'))
          .expect(403);
        await http()
          .patch(`/invoices/restore/${acmeId}`)
          .set(as('grace'))
          .expect(204);

        expect(await managerRead()).toEqual({
          ...clerkView(),
          internalNotes: 'slow payer',
        });
      });

      it("a soft-deleted invoice stays out of another tenant's reach", async () => {
        await http()
          .delete(`/invoices/soft/${acmeId}`)
          .set(as('sam'))
          .expect(204);

        await http()
          .get(`/invoices/${acmeId}?includeDeleted=1`)
          .set(as('gus'))
          .expect(404);
        await http()
          .patch(`/invoices/restore/${acmeId}`)
          .set(as('gus'))
          .expect(404);
        await http()
          .delete(`/invoices/${acmeId}?includeDeleted=1`)
          .set(as('gus'))
          .expect(404);

        const stored = await http()
          .get(`/invoices/${acmeId}?includeDeleted=1`)
          .set(as('grace'))
          .expect(200);
        expect(stored.body.deletedAt).not.toEqual(null);
      });

      it('a clerk may not restore by clearing the delete date', async () => {
        await http()
          .delete(`/invoices/soft/${acmeId}`)
          .set(as('sam'))
          .expect(204);

        const response = await http()
          .patch(`/invoices/${acmeId}?includeDeleted=1`)
          .set(as('alice'))
          .send({ deletedAt: null });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
        await http().get(`/invoices/${acmeId}`).set(as('grace')).expect(404);
      });

      it('a clerk may neither soft delete nor restore', async () => {
        await http()
          .delete(`/invoices/soft/${acmeId}`)
          .set(as('alice'))
          .expect(403);
        await http()
          .patch(`/invoices/restore/${acmeId}`)
          .set(as('alice'))
          .expect(403);
      });

      it('a clerk may not soft delete by writing the delete date', async () => {
        await http()
          .patch(`/invoices/${acmeId}`)
          .set(as('alice'))
          .send({ deletedAt: new Date().toISOString() })
          .expect(403);

        expect((await managerRead()).deletedAt).toEqual(null);
      });

      it('a manager deletes for good', async () => {
        await http().delete(`/invoices/${acmeId}`).set(as('grace')).expect(204);
        await http().get(`/invoices/${acmeId}`).set(as('grace')).expect(404);
      });
    });

    describe('cascades', () => {
      it('a role that may create invoices but not lines creates neither', async () => {
        await http()
          .post('/desk/invoices')
          .set(as('jun'))
          .send(invoice({ lines: [{ sku: 'widget', amount: 300 }] }))
          .expect(403);
        await http()
          .post('/invoices')
          .set(as('jun'))
          .send(invoice({ lines: [{ sku: 'widget', amount: 300 }] }))
          .expect(403);

        expect(await acmeCount()).toEqual(1);

        // Without lines, the same role may.
        await http()
          .post('/invoices')
          .set(as('jun'))
          .send(invoice())
          .expect(201);
      });

      it('intake creates an invoice with lines it may not read back', async () => {
        const created = await http()
          .post('/desk/invoices')
          .set(as('ivy'))
          .send(invoice({ lines: [{ sku: 'widget', amount: 300 }] }))
          .expect(201);

        // The response filter shows what a read would: nothing.
        expect(created.body).toEqual({});
        expect(await acmeCount()).toEqual(2);
        await http().get('/invoices').set(as('ivy')).expect(403);
      });
    });
  });

  describe('D. response layer', () => {
    it("a clerk's create, batch and update responses hold no notes", async () => {
      const created = await http()
        .post('/invoices')
        .set(as('alice'))
        .send(invoice())
        .expect(201);
      expect(created.body).toEqual({
        id: expect.any(String),
        tenantId: 'acme',
        number: 'A-2',
        amount: 300,
        customerId: customer.id,
        deletedAt: null,
      });

      const batch = await http()
        .post('/invoices/bulk')
        .set(as('alice'))
        .send({
          bulk: [invoice({ number: 'A-3' }), invoice({ number: 'A-4' })],
        })
        .expect(201);
      expect(batch.body).toEqual(
        ['A-3', 'A-4'].map((number) => ({
          id: expect.any(String),
          tenantId: 'acme',
          number,
          amount: 300,
          customerId: customer.id,
          deletedAt: null,
        })),
      );

      await http()
        .patch(`/invoices/${acmeId}`)
        .set(as('alice'))
        .send({ number: 'A-1b' })
        .expect(200, { ...clerkView(), number: 'A-1b' });

      const desk = await http()
        .post('/desk/invoices')
        .set(as('alice'))
        .send(invoice({ lines: [{ sku: 'widget', amount: 300 }] }))
        .expect(201);
      expect(desk.body).not.toHaveProperty('internalNotes');
    });

    it('a refused query on the notes tells nothing about them', async () => {
      const refusals = await Promise.all(
        [
          'filter=internalNotes||$starts||slow',
          `s=${encodeURIComponent('{"internalNotes":"slow payer"}')}`,
        ].map((query) =>
          http()
            .get(`/invoices/${acmeId}?${query}`)
            .set(as('alice'))
            .expect(403),
        ),
      );

      for (const refused of refusals) {
        expect(refused.text).not.toContain('slow');
        expect(refused.text).not.toContain('payer');
        expect(refused.text).not.toContain('internalNotes');
      }
    });

    /**
     * A generated route publishes its fields in its OpenAPI document, so
     * CRUD refuses a field that is no column as a bad request before the
     * repository sees it; a hidden one is the repository's refusal.
     */
    it('a column that does not exist is a bad request, a hidden one a refusal', async () => {
      await http()
        .get(`/invoices/${acmeId}?filter=internalNotes||$eq||x`)
        .set(as('alice'))
        .expect(403);
      await http()
        .get(`/invoices/${acmeId}?filter=noSuchColumn||$eq||x`)
        .set(as('alice'))
        .expect(400);
      await http()
        .get(
          `/invoices/${acmeId}?s=${encodeURIComponent('{"noSuchColumn":"x"}')}`,
        )
        .set(as('alice'))
        .expect(400);
    });

    // A caller whose read rules name fields gets the policy's 403 instead.
    it('a read by a caller denied only some columns ignores its sort, so a sort on a column that does not exist is no error', async () => {
      await http()
        .get(`/invoices/${acmeId}?sort=noSuchColumn,ASC`)
        .set(as('alice'))
        .expect(200, clerkView());
      await http()
        .get('/invoices?sort=noSuchColumn,ASC')
        .set(as('alice'))
        .expect(400);
    });

    it('a response schema requiring a column the caller may not read fails, and shows nothing of it', async () => {
      const failed = await http()
        .get(`/strict/invoices/${acmeId}`)
        .set(as('alice'))
        .expect(500);
      // The repository already left the value out; the schema's error must
      // not name the column it missed either.
      expect(failed.text).not.toContain('internalNotes');

      await http()
        .get(`/strict/invoices/${acmeId}`)
        .set(as('grace'))
        .expect(200, { ...clerkView(), internalNotes: 'slow payer' });
    });

    it("a refused cross-tenant read carries nothing of the other tenant's row", async () => {
      const refused = await http()
        .get(`/invoices/${globexId}`)
        .set(as('alice'))
        .expect(404);

      expect(refused.text).not.toContain('G-1');
      expect(refused.text).not.toContain('globex');
    });
  });

  describe('E. cross-layer', () => {
    it('headers claiming another actor or tenant change nothing', async () => {
      const forged = {
        ...as('alice'),
        'X-Actor': JSON.stringify({ kind: 'role', roles: ['manager'] }),
        'X-Roles': 'manager',
        'X-Tenant': 'globex',
        'X-Tenant-Id': 'globex',
        'X-User-Id': 'grace',
      };

      await http().delete(`/invoices/${acmeId}`).set(forged).expect(403);
      await http()
        .get(`/invoices/${globexId}?actor=manager&tenantId=globex`)
        .set(forged)
        .expect(404);
      await http()
        .get('/desk/invoices?actor=manager&tenantId=globex')
        .set(forged)
        .expect(200, [
          { ...clerkView(), customer: { id: customer.id, name: 'Initech' } },
        ]);
    });

    it('a body claiming another actor changes nothing', async () => {
      const response = await http()
        .post('/desk/invoices')
        .set(as('alice'))
        .send({
          ...invoice({ internalNotes: 'mine' }),
          actor: { kind: 'role', roles: ['manager'], userId: 'grace' },
          ctx: { actor: { kind: 'role', roles: ['manager'] } },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(await acmeCount()).toEqual(1);
    });

    it('a read through a context of its own is refused, not run unrestricted', async () => {
      for (const user of ['alice', 'grace']) {
        const refused = await http()
          .get('/desk/invoices/detached')
          .set(as(user));

        expect(refused.status).toEqual(403);
        expect(refused.text).not.toContain('A-1');
        expect(refused.text).not.toContain('G-1');
      }
    });

    it("a caller's permissions show their own rules, no one else's", async () => {
      await http()
        .get('/desk/me/permissions')
        .set(as('alice'))
        .expect(200, [
          {
            action: 'update',
            subject: 'invoice',
            fields: ['amount'],
            inverted: true,
          },
        ]);
      await http().get('/desk/me/permissions').expect(401);
    });

    it('the route audit refuses to boot an application with an open route', async () => {
      @Controller('leaky')
      class LeakyController {
        @Get()
        leak() {
          return [];
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [AttackModule],
        controllers: [LeakyController],
      }).compile();
      const leaky = moduleRef.createNestApplication();

      const failure = await leaky.init().then(
        () => undefined,
        (error: unknown) => error,
      );
      await leaky.close();

      expect(failure).toBeInstanceOf(RouteAuditFailedException);
      expect(failure).toHaveProperty(
        'message',
        expect.stringContaining('GET /leaky'),
      );
    });

    it("the only stored rows a manager sees are their own tenant's", async () => {
      const lines = await globexLines();
      expect(lines).toEqual([
        expect.objectContaining({ id: globexLineId, tenantId: 'globex' }),
      ]);
      expect(
        await app
          .get<RepositoryInterface<AttackInvoiceLineEntity>>(
            getDynamicRepositoryToken(INVOICE_LINE),
          )
          .find({
            where: Where.eq('id', globexLineId),
            ctx: storedAs(
              { kind: 'role', roles: ['manager'], userId: 'grace' },
              'acme',
            ),
          }),
      ).toEqual([]);
    });
  });
});

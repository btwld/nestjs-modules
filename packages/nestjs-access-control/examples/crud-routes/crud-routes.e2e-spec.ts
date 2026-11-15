import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CrudRoutesModule } from './crud-routes.module.js';

describe('CRUD routes', () => {
  let app: INestApplication;
  let invoiceId: string;

  const as = (user: string) => ({ Authorization: `Bearer ${user}` });
  const INVOICE = { customer: 'Initech', amount: 1200, notes: 'slow payer' };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudRoutesModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/invoices')
      .set(as('grace'))
      .send(INVOICE)
      .expect(201);
    invoiceId = created.body.id;
  });

  afterEach(() => app.close());

  it('a clerk lists invoices without their notes', async () => {
    const listed = await request(app.getHttpServer())
      .get('/invoices')
      .set(as('ada'))
      .expect(200);

    expect(listed.body.data).toEqual([
      { id: invoiceId, customer: 'Initech', amount: 1200 },
    ]);
  });

  it.each([
    { name: 'sort by', query: 'sort=notes,ASC' },
    { name: 'filter on', query: 'filter=notes||$starts||slow' },
    {
      name: 'search',
      query: `s=${encodeURIComponent('{"notes":"slow payer"}')}`,
    },
  ])(
    'a clerk may not $name the notes, which would tell them what they say',
    async ({ query }) => {
      await request(app.getHttpServer())
        .get(`/invoices?${query}`)
        .set(as('ada'))
        .expect(403);
    },
  );

  it('a clerk enters a batch of invoices, and reads them back without the notes', async () => {
    const created = await request(app.getHttpServer())
      .post('/invoices/bulk')
      .set(as('ada'))
      .send({
        bulk: [INVOICE, { customer: 'Initrode', amount: 80, notes: 'new' }],
      })
      .expect(201);

    expect(created.body).toEqual([
      { id: expect.any(String), customer: 'Initech', amount: 1200 },
      { id: expect.any(String), customer: 'Initrode', amount: 80 },
    ]);
  });

  it('a user with no role may not enter a batch', async () => {
    await request(app.getHttpServer())
      .post('/invoices/bulk')
      .set(as('eve'))
      .send({ bulk: [INVOICE] })
      .expect(403);

    const listed = await request(app.getHttpServer())
      .get('/invoices')
      .set(as('grace'))
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
  });

  it('a manager may filter on the notes', async () => {
    const listed = await request(app.getHttpServer())
      .get('/invoices?filter=notes||$starts||slow')
      .set(as('grace'))
      .expect(200);

    expect(listed.body.data).toHaveLength(1);
  });

  it('a clerk corrects the customer, but not the amount', async () => {
    await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set(as('ada'))
      .send({ amount: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .set(as('ada'))
      .send({ customer: 'Initrode' })
      .expect(200, { id: invoiceId, customer: 'Initrode', amount: 1200 });
  });

  it('a clerk may not replace an invoice, which would write its amount', async () => {
    await request(app.getHttpServer())
      .put(`/invoices/${invoiceId}`)
      .set(as('ada'))
      .send({ customer: 'Initech', amount: 1200, notes: '' })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/invoices/${invoiceId}`)
      .set(as('grace'))
      .send({ customer: 'Initech', amount: 900, notes: 'settled' })
      .expect(200);
  });

  it('only a manager deletes', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set(as('ada'))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set(as('grace'))
      .expect(204);
  });
});

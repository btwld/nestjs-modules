import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SharedRulesModule } from './shared-rules.module.js';

describe('Shared rules', () => {
  let app: INestApplication;
  let invoiceId: string;

  const as = (user: string) => ({ Authorization: `Bearer ${user}` });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedRulesModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/invoices')
      .set(as('grace'))
      .send({ customer: 'Initech', amount: 1200, internalNotes: 'slow payer' })
      .expect(201);
    invoiceId = created.body.id;
  });

  afterEach(() => app.close());

  it('a clerk lists invoices without the column the rules hide from them', async () => {
    await request(app.getHttpServer())
      .get('/invoices')
      .set(as('ada'))
      .expect(200, [{ id: invoiceId, customer: 'Initech', amount: 1200 }]);
  });

  it('a manager lists invoices with every column', async () => {
    await request(app.getHttpServer())
      .get('/invoices')
      .set(as('grace'))
      .expect(200, [
        {
          id: invoiceId,
          customer: 'Initech',
          amount: 1200,
          internalNotes: 'slow payer',
        },
      ]);
  });

  it('a clerk may not delete: the route is refused before the handler runs', async () => {
    const refused = await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set(as('ada'))
      .expect(403);

    expect(refused.body.message).toEqual(
      'Access refused: delete:any on invoices (authority)',
    );
  });

  it('a manager deletes', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${invoiceId}`)
      .set(as('grace'))
      .expect(200);
  });

  it('this API narrows the shared rules: a clerk may not change an amount here', async () => {
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

  it('a caller who is not signed in is refused', async () => {
    await request(app.getHttpServer()).get('/invoices').expect(403);
  });
});

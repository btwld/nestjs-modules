import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { bearer, refused } from '../shared/demo-e2e.util.js';

import { RoleBasedApiModule } from './role-based-api.module.js';

describe('Example: role-based API', () => {
  let app: INestApplication;
  let api: ReturnType<typeof supertest>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoleBasedApiModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterEach(() => app.close());

  it('refuses a caller who is not signed in', () =>
    api
      .get('/invoices')
      .expect(403)
      .expect(refused('read on invoice (no-actor)')));

  it('refuses a user with no role', () =>
    api
      .get('/invoices')
      .set(bearer('dee'))
      .expect(403)
      .expect(refused('read on invoice (no-grant)')));

  it('shows a viewer invoices without their internal notes', () =>
    api
      .get('/invoices')
      .set(bearer('cy'))
      .expect(200)
      .expect([
        { id: 'inv-1', customer: 'Acme', amount: 1200, status: 'sent' },
      ]));

  it('shows an accountant the whole invoice', () =>
    api.get('/invoices/inv-1').set(bearer('ben')).expect(200).expect({
      id: 'inv-1',
      customer: 'Acme',
      amount: 1200,
      status: 'sent',
      internalNotes: 'Slow payer; call before the due date',
    }));

  it('refuses a viewer creating an invoice', () =>
    api
      .post('/invoices')
      .set(bearer('cy'))
      .send({ customer: 'Globex', amount: 90, status: 'draft' })
      .expect(403)
      .expect(refused('create on invoice (no-grant)')));

  it('lets an accountant change the notes but not the amount', async () => {
    // The response shows what ben may read, `amount` included.
    await api
      .patch('/invoices/inv-1')
      .set(bearer('ben'))
      .send({ internalNotes: 'Paid by phone' })
      .expect(200)
      .expect({
        id: 'inv-1',
        customer: 'Acme',
        amount: 1200,
        status: 'sent',
        internalNotes: 'Paid by phone',
      });

    await api
      .patch('/invoices/inv-1')
      .set(bearer('ben'))
      .send({ internalNotes: 'Discounted', amount: 1000 })
      .expect(403)
      .expect(refused('update on invoice (field)'));

    const { body } = await api
      .get('/invoices/inv-1')
      .set(bearer('ada'))
      .expect(200);

    expect(body).toEqual(
      expect.objectContaining({ amount: 1200, internalNotes: 'Paid by phone' }),
    );
  });

  it('lets only an admin delete an invoice', async () => {
    await api
      .delete('/invoices/inv-1')
      .set(bearer('ben'))
      .expect(403)
      .expect(refused('delete on invoice (no-grant)'));

    await api.delete('/invoices/inv-1').set(bearer('ada')).expect(200);
    await api.get('/invoices/inv-1').set(bearer('ada')).expect(404);
  });
});

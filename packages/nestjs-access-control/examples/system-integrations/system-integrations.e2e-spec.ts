import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AccessRefusedException } from '@concepta/nestjs-access-control';

import { bearer, refused } from '../shared/demo-e2e.util.js';

import { BillingStore } from './billing.store.js';
import { type InvoiceInterface } from './invoice.interface.js';
import { PaymentEventConsumer } from './payment-event.consumer.js';
import { SystemIntegrationsModule } from './system-integrations.module.js';

const apiKey = (key: string) => ({ 'x-api-key': key });

const PAID: Pick<InvoiceInterface, 'status' | 'paidAt'> = {
  status: 'paid',
  paidAt: '2026-11-09T10:00:00.000Z',
};

describe('Example: system integrations', () => {
  let app: INestApplication;
  let api: ReturnType<typeof supertest>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemIntegrationsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterEach(() => app.close());

  describe('over HTTP', () => {
    it('lets the payment provider mark an invoice paid, showing it nothing it may not read', async () => {
      await api
        .patch('/invoices/inv-7')
        .set(apiKey('key-billing'))
        .send(PAID)
        .expect(200)
        .expect({});

      expect(app.get(BillingStore).invoice('inv-7')).toEqual({
        id: 'inv-7',
        amount: 300,
        ...PAID,
      });
    });

    it('refuses the payment provider changing an amount', () =>
      api
        .patch('/invoices/inv-7')
        .set(apiKey('key-billing'))
        .send({ ...PAID, amount: 1 })
        .expect(403)
        .expect(refused('update:any on invoice (field)')));

    it('shows the CRM a customer without their card', () =>
      api
        .get('/customers/cus-1')
        .set(apiKey('key-crm'))
        .expect(200)
        .expect({ id: 'cus-1', name: 'Acme', email: 'ap@acme.test' }));

    it('refuses the CRM what only billing holds', () =>
      api
        .patch('/invoices/inv-7')
        .set(apiKey('key-crm'))
        .send(PAID)
        .expect(403)
        .expect(refused('update:any on invoice (no-grant)')));

    it('refuses an unknown key as nobody acting', () =>
      api
        .get('/customers/cus-1')
        .set(apiKey('key-stolen'))
        .expect(403)
        .expect(refused('read:any on customer (no-actor)')));

    it('gives a person whose role is named billing none of the system’s grants', () =>
      api
        .patch('/invoices/inv-7')
        .set(bearer('bill'))
        .send(PAID)
        .expect(403)
        .expect(refused('update:any on invoice (no-grant)')));

    it('serves staff and systems from the same routes', () =>
      api.get('/customers/cus-1').set(bearer('sam')).expect(200).expect({
        id: 'cus-1',
        name: 'Acme',
        email: 'ap@acme.test',
        cardNumber: '4242',
      }));
  });

  describe('from a queue', () => {
    it('applies a payment event as the billing system', async () => {
      expect(
        await app
          .get(PaymentEventConsumer)
          .handle({ invoiceId: 'inv-7', changes: PAID }),
      ).toEqual({ id: 'inv-7', amount: 300, ...PAID });
    });

    it('refuses an event that changes more than billing may', async () => {
      await expect(
        app
          .get(PaymentEventConsumer)
          .handle({ invoiceId: 'inv-7', changes: { amount: 1 } }),
      ).rejects.toThrow(AccessRefusedException);
      expect(app.get(BillingStore).invoice('inv-7').amount).toEqual(300);
    });
  });
});

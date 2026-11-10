import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { BillingSyncJob } from './billing-sync.job.js';
import { RoleBasedOrdersModule } from './role-based-orders.module.js';

describe('Role-based orders', () => {
  let app: INestApplication;
  let orderId: string;

  const as = (roles: string) => ({ 'X-Roles': roles });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoleBasedOrdersModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set(as('clerk'))
      .send({ customer: 'Ada', total: 1200, cost: 700 })
      .expect(201);
    orderId = created.body.id;
  });

  afterEach(() => app.close());

  it('a clerk creates an order, and the response leaves out its cost', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set(as('clerk'))
      .send({ customer: 'Grace', total: 900, cost: 400 })
      .expect(201);

    expect(created.body).toEqual({
      id: expect.any(String),
      customer: 'Grace',
      total: 900,
      status: 'open',
    });
  });

  it('a clerk lists orders without their cost', async () => {
    await request(app.getHttpServer())
      .get('/orders')
      .set(as('clerk'))
      .expect(200, [
        { id: orderId, customer: 'Ada', total: 1200, status: 'open' },
      ]);
  });

  it('a manager lists orders with their cost', async () => {
    await request(app.getHttpServer())
      .get('/orders')
      .set(as('manager'))
      .expect(200, [
        {
          id: orderId,
          customer: 'Ada',
          total: 1200,
          cost: 700,
          status: 'open',
        },
      ]);
  });

  it('a clerk may not sort by cost, which would reveal it', async () => {
    await request(app.getHttpServer())
      .get('/orders?sort=cost')
      .set(as('clerk'))
      .expect(403);
  });

  it('a clerk may change the customer, but not the total', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .set(as('clerk'))
      .send({ total: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}`)
      .set(as('clerk'))
      .send({ customer: 'Ada Lovelace' })
      .expect(200, {
        id: orderId,
        customer: 'Ada Lovelace',
        total: 1200,
        status: 'open',
      });
  });

  it('only a manager deletes an order', async () => {
    await request(app.getHttpServer())
      .delete(`/orders/${orderId}`)
      .set(as('clerk'))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/orders/${orderId}`)
      .set(as('manager'))
      .expect(200);
  });

  it('a request with no actor is refused', async () => {
    await request(app.getHttpServer()).get('/orders').expect(403);
  });

  it('the billing job settles an order as the billing-sync system', async () => {
    const settled = await app
      .get(BillingSyncJob)
      .settle(orderId, { total: 1150, status: 'billed' });

    expect(settled).toEqual({
      id: orderId,
      customer: 'Ada',
      total: 1150,
      cost: 700,
      status: 'billed',
    });
  });

  it('the billing job may not change anything but the total and status', async () => {
    await expect(
      app.get(BillingSyncJob).settle(orderId, { customer: 'Mallory' }),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });
});

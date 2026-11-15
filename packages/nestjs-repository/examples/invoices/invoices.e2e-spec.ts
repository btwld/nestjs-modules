import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ActorCtx, AppContextHost } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type CustomerEntity } from './invoice.entities.js';
import { CUSTOMER } from './invoice.rules.js';
import { InvoicesModule } from './invoices.module.js';

describe('Invoices with lines and customers', () => {
  let app: INestApplication;
  let customer: CustomerEntity;

  const as = (roles: string, tenant = 'acme') => ({
    'X-Roles': roles,
    'X-Tenant': tenant,
  });
  const invoice = () => ({
    number: 'INV-1',
    customerId: customer.id,
    lines: [
      { sku: 'widget', amount: 500 },
      { sku: 'gadget', amount: 700 },
    ],
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [InvoicesModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const seeder = new AppContextHost();
    seeder.defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'seeder' },
      {
        immutable: true,
      },
    );
    const customers: RepositoryInterface<CustomerEntity> = app.get(
      getDynamicRepositoryToken(CUSTOMER),
    );
    customer = await customers.create(
      { name: 'Initech', creditLimit: 50000 },
      { ctx: seeder },
    );
  });

  afterEach(() => app.close());

  it('a clerk creates an invoice with its lines, stamped with their tenant', async () => {
    const created = await request(app.getHttpServer())
      .post('/invoices')
      .set(as('clerk'))
      .send(invoice())
      .expect(201);

    expect(created.body).toEqual({
      id: expect.any(String),
      tenantId: 'acme',
      number: 'INV-1',
      customerId: customer.id,
      lines: [
        {
          id: expect.any(String),
          tenantId: 'acme',
          invoiceId: created.body.id,
          sku: 'widget',
          amount: 500,
        },
        {
          id: expect.any(String),
          tenantId: 'acme',
          invoiceId: created.body.id,
          sku: 'gadget',
          amount: 700,
        },
      ],
    });
  });

  it('intake creates an invoice it may not read, and gets back only its keys', async () => {
    const created = await request(app.getHttpServer())
      .post('/invoices')
      .set(as('intake'))
      .send(invoice())
      .expect(201);

    expect(created.body).toEqual({
      id: expect.any(String),
      lines: [{ id: expect.any(String) }, { id: expect.any(String) }],
    });

    await request(app.getHttpServer())
      .get('/invoices')
      .set(as('intake'))
      .expect(403);
  });

  it('a junior may not create lines, so the invoice is not created either', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set(as('junior'))
      .send(invoice())
      .expect(403);

    await request(app.getHttpServer())
      .get('/invoices')
      .set(as('clerk'))
      .expect(200, []);
  });

  describe('with an invoice', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/invoices')
        .set(as('clerk'))
        .send(invoice())
        .expect(201);
    });

    it('a clerk joins each customer, without its credit limit', async () => {
      const listed = await request(app.getHttpServer())
        .get('/invoices?include=customer')
        .set(as('clerk'))
        .expect(200);

      expect(listed.body).toEqual([
        expect.objectContaining({
          customer: { id: customer.id, name: 'Initech' },
        }),
      ]);
    });

    it('collections join each customer with its credit limit', async () => {
      const listed = await request(app.getHttpServer())
        .get('/invoices?include=customer')
        .set(as('collector'))
        .expect(200);

      expect(listed.body).toEqual([
        expect.objectContaining({
          customer: { id: customer.id, name: 'Initech', creditLimit: 50000 },
        }),
      ]);
    });

    it("another tenant's clerk sees none of them: row scope still decides which rows", async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .set(as('clerk', 'globex'))
        .expect(200, []);
    });
  });
});

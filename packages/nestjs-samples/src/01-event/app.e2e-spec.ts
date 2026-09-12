import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from './app.module';
import { type CreateOrderDto } from './order/dto/create-order.dto';
import {
  OrderCreatedListener,
  OrderCreatedListenerAsync,
} from './order/listeners/order-created.listener';

// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';

describe('AppController (e2e)', () => {
  describe('Express', () => {
    let app: INestApplication;
    let spySync: jest.SpyInstance;
    let spyAsync: jest.SpyInstance;

    beforeEach(async () => {
      spySync = jest.spyOn(OrderCreatedListener.prototype, 'listen');
      spyAsync = jest.spyOn(OrderCreatedListenerAsync.prototype, 'listen');

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      jest.clearAllMocks();
      await app.close();
    });

    it('POST /orders/sync', async () => {
      const order: CreateOrderDto = {
        name: 'Order 1',
        description: 'My First Order',
      };

      await supertest(app.getHttpServer())
        .post('/orders/sync')
        .send(order)
        .expect(201)
        .expect({ id: 3, ...order });

      expect(spySync).toHaveBeenCalledTimes(1);

      return;
    });

    it('POST /orders/async', async () => {
      const order: CreateOrderDto = {
        name: 'Order 2',
        description: 'My Second Order',
      };

      await supertest(app.getHttpServer())
        .post('/orders/async')
        .send(order)
        .expect(201)
        .expect({ id: 3, ...order });

      expect(spyAsync).toHaveBeenCalledTimes(1);

      return;
    });
  });

  /*
  describe('Fastify', () => {
    let app: NestFastifyApplication;
    let spySync: jest.SpyInstance;
    let spyAsync: jest.SpyInstance;

    beforeEach(async () => {
      spySync = jest.spyOn(OrderCreatedListener.prototype, 'listen');
      spyAsync = jest.spyOn(OrderCreatedListenerAsync.prototype, 'listen');

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      await app.init();
    });

    afterEach(async () => {
      jest.clearAllMocks();
      await app.close();
    });

    it('POST /orders/sync', async () => {
      const order: CreateOrderDto = {
        name: 'Order 1',
        description: 'My First Order',
      };

      return app
        .inject({
          method: 'POST',
          url: '/orders/sync',
          payload: order,
        })
        .then(({ statusCode, payload }) => {
          expect(statusCode).toEqual(201);
          expect(JSON.parse(payload)).toEqual({ id: 3, ...order });
          expect(spySync).toHaveBeenCalledTimes(1);
        });
    });

    it('POST /orders/async', async () => {
      const order: CreateOrderDto = {
        name: 'Order 2',
        description: 'My Second Order',
      };

      return app
        .inject({
          method: 'POST',
          url: '/orders/async',
          payload: order,
        })
        .then(({ statusCode, payload }) => {
          expect(statusCode).toEqual(201);
          expect(JSON.parse(payload)).toEqual({ id: 3, ...order });
          expect(spyAsync).toHaveBeenCalledTimes(1);
        });
    });
  });
  */
});

import request from 'supertest';

import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { ExceptionsFilter } from '@concepta/nestjs-common';

import { TestCrudAdapter } from '../../../__fixtures__/crud/adapters/test-crud.adapter';
import { TestModelCreateManyDto } from '../../../__fixtures__/crud/dto/test-model-create-many.dto';
import { TestModelCreateDto } from '../../../__fixtures__/crud/dto/test-model-create.dto';
import { TestModelUpdateDto } from '../../../__fixtures__/crud/dto/test-model-update.dto';
import { TestModelDto } from '../../../__fixtures__/crud/models/test.model';
import { CrudModule } from '../../../crud.module';
import { CrudRequestQueryBuilder } from '../../../request/crud-request-query.builder';
import { CrudCreateManyInterface } from '../../interfaces/crud-create-many.interface';
import { CrudRequestInterface } from '../../interfaces/crud-request.interface';
import { CrudCreateMany } from '../actions/crud-create-many.decorator';
import { CrudCreateOne } from '../actions/crud-create-one.decorator';
import { CrudDeleteOne } from '../actions/crud-delete-one.decorator';
import { CrudGetMany } from '../actions/crud-get-many.decorator';
import { CrudGetOne } from '../actions/crud-get-one.decorator';
import { CrudReplaceOne } from '../actions/crud-replace-one.decorator';
import { CrudUpdateOne } from '../actions/crud-update-one.decorator';
import { CrudBody } from '../params/crud-body.decorator';
import { CrudRequest } from '../params/crud-request.decorator';

import { CrudController } from './crud-controller.decorator';

describe('#crud', () => {
  describe('#base methods', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudRequestQueryBuilder;

    @CrudController({
      path: 'test',
      model: { type: TestModelDto },
      params: {
        id: { field: 'id', type: 'number' },
      },
      validation: {
        transformOptions: {
          strategy: 'exposeAll',
        },
      },
    })
    class TestController {
      constructor(public service: TestCrudAdapter<TestModelDto>) {}

      @CrudGetMany()
      async getMany(@CrudRequest() req: CrudRequestInterface<TestModelDto>) {
        return this.service.getMany(req);
      }

      @CrudGetOne()
      async getOne(@CrudRequest() req: CrudRequestInterface<TestModelDto>) {
        return this.service.getOne(req);
      }

      @CrudCreateOne()
      async createOne(
        @CrudRequest() req: CrudRequestInterface<TestModelDto>,
        @CrudBody() dto: TestModelCreateDto,
      ) {
        return this.service.createOne(req, dto);
      }

      @CrudReplaceOne()
      async replaceOne(
        @CrudRequest() req: CrudRequestInterface<TestModelDto>,
        @CrudBody() dto: TestModelCreateDto,
      ) {
        return this.service.replaceOne(req, dto);
      }

      @CrudUpdateOne()
      async updateOne(
        @CrudRequest() req: CrudRequestInterface<TestModelDto>,
        @CrudBody() dto: TestModelUpdateDto,
      ) {
        return this.service.updateOne(req, dto);
      }

      @CrudCreateMany()
      async createMany(
        @CrudRequest() req: CrudRequestInterface<TestModelDto>,
        @CrudBody() dto: TestModelCreateManyDto,
      ) {
        return this.service.createMany(req, dto);
      }

      @CrudDeleteOne()
      async deleteOne(@CrudRequest() req: CrudRequestInterface<TestModelDto>) {
        return this.service.deleteOne(req);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [CrudModule.forRoot({})],
        controllers: [TestController],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          TestCrudAdapter,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();
    });

    beforeEach(() => {
      qb = CrudRequestQueryBuilder.create();
    });

    afterAll(async () => {
      app.close();
    });

    describe('#getMany', () => {
      it('should return status 200', (done) => {
        request(server)
          .get('/test')
          .end((_, res) => {
            expect(res.status).toEqual(200);
            done();
          });
      });
      it('should return status 400', (done) => {
        const query = qb.setFilter({ field: 'foo', operator: '$gt' }).query();
        request(server)
          .get('/test')
          .query(query)
          .end((_, res) => {
            const expected = {
              statusCode: 400,
              errorCode: 'CRUD_REQUEST_ERROR',
            };
            expect(res.status).toEqual(400);
            expect(res.body).toMatchObject(expected);
            done();
          });
      });
    });

    describe('#getOne', () => {
      it('should return status 200', (done) => {
        request(server)
          .get('/test/1')
          .end((_, res) => {
            expect(res.status).toEqual(200);
            done();
          });
      });
      it('should return status 400', (done) => {
        request(server)
          .get('/test/invalid')
          .end((_, res) => {
            const expected = {
              statusCode: 400,
              errorCode: 'CRUD_REQUEST_ERROR',
            };
            expect(res.status).toEqual(400);
            expect(res.body).toMatchObject(expected);
            done();
          });
      });
    });

    describe('#createBase', () => {
      it('should return status 201', (done) => {
        const send: TestModelDto = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
          age: 15,
        };
        request(server)
          .post('/test')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(201);
            done();
          });
      });
      it('should return status 400', (done) => {
        const send: TestModelDto = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
        };
        request(server)
          .post('/test')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(400);
            done();
          });
      });
    });

    describe('#createMany', () => {
      it('should return status 201', (done) => {
        const send: CrudCreateManyInterface<TestModelDto> = {
          bulk: [
            {
              firstName: 'firstName',
              lastName: 'lastName',
              email: 'test@test.com',
              age: 15,
            },
            {
              firstName: 'firstName',
              lastName: 'lastName',
              email: 'test@test.com',
              age: 15,
            },
          ],
        };
        request(server)
          .post('/test/bulk')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(201);
            done();
          });
      });
      it('should return status 400', (done) => {
        const send: CrudCreateManyInterface<TestModelDto> = {
          bulk: [],
        };
        request(server)
          .post('/test/bulk')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(400);
            done();
          });
      });
    });

    describe('#replaceOne', () => {
      it('should return status 200', (done) => {
        const send: TestModelDto = {
          id: 1,
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
          age: 15,
        };
        request(server)
          .put('/test/1')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(200);
            done();
          });
      });
      it('should return status 400', (done) => {
        const send: TestModelDto = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
        };
        request(server)
          .put('/test/1')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(400);
            done();
          });
      });
    });

    describe('#updateOne', () => {
      it('should return status 200', (done) => {
        const send: TestModelDto = {
          id: 1,
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
          age: 15,
        };
        request(server)
          .patch('/test/1')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(200);
            done();
          });
      });
      it('should return status 400', (done) => {
        const send: TestModelDto = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'test@test.com',
        };
        request(server)
          .patch('/test/1')
          .send(send)
          .end((_, res) => {
            expect(res.status).toEqual(400);
            done();
          });
      });
    });

    describe('#deleteOne', () => {
      it('should return status 200', (done) => {
        request(server)
          .delete('/test/1')
          .end((_, res) => {
            expect(res.status).toEqual(200);
            done();
          });
      });
    });
  });
});

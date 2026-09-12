import request from 'supertest';
import { DataSource } from 'typeorm';
import { z } from 'zod';

import { Inject, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { Ctx } from '@concepta/nestjs-core';
import { RepositoryModule, Transactional } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudCreateBatchHandler } from '../application/commands/handlers/crud-create-batch.handler.js';
import { CrudCreateHandler } from '../application/commands/handlers/crud-create.handler.js';
import { CrudDeleteHandler } from '../application/commands/handlers/crud-delete.handler.js';
import { CrudReplaceHandler } from '../application/commands/handlers/crud-replace.handler.js';
import { CrudRestoreHandler } from '../application/commands/handlers/crud-restore.handler.js';
import { CrudSoftDeleteHandler } from '../application/commands/handlers/crud-soft-delete.handler.js';
import { CrudUpdateHandler } from '../application/commands/handlers/crud-update.handler.js';
import { CrudListHandler } from '../application/queries/handlers/crud-list.handler.js';
import { CrudReadHandler } from '../application/queries/handlers/crud-read.handler.js';
import {
  createCommandHandler,
  createQueryHandler,
} from '../application/utils/create-operation-handlers.js';
import { CrudModule } from '../crud.module.js';
import { CrudAdapter } from '../infrastructure/adapters/crud.adapter.js';
import { CrudController } from '../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudCreateBatch } from '../infrastructure/decorators/operations/crud-create-batch.decorator.js';
import { CrudCreate } from '../infrastructure/decorators/operations/crud-create.decorator.js';
import { CrudDelete } from '../infrastructure/decorators/operations/crud-delete.decorator.js';
import { CrudList } from '../infrastructure/decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../infrastructure/decorators/operations/crud-read.decorator.js';
import { CrudReplace } from '../infrastructure/decorators/operations/crud-replace.decorator.js';
import { CrudRestore } from '../infrastructure/decorators/operations/crud-restore.decorator.js';
import { CrudSoftDelete } from '../infrastructure/decorators/operations/crud-soft-delete.decorator.js';
import { CrudUpdate } from '../infrastructure/decorators/operations/crud-update.decorator.js';
import { CrudBody } from '../infrastructure/decorators/params/crud-body.decorator.js';
import { CrudLimit } from '../infrastructure/decorators/routes/crud-limit.decorator.js';
import { CrudCtx } from '../infrastructure/interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { CrudQueryBuilder } from '../infrastructure/request/crud-query.builder.js';
import { CrudAdapterResolver } from '../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import { createCrudAdapterProvider } from '../infrastructure/utils/create-crud-adapter-provider.js';

import { createCrudOperationClasses } from '../__fixtures__/crud/create-crud-operation-classes.fixture.js';
import {
  CRUD_TEST_COMPANY_ENTITY_NAME,
  CRUD_TEST_DEVICE_ENTITY_NAME,
} from '../__fixtures__/crud-test.constants.js';
import { CompanyEntity } from '../__fixtures__/typeorm/company/company.entity.js';
import { companyCreateBatchResponseSchema } from '../__fixtures__/typeorm/company/schemas/company-create-batch-response.schema.js';
import { companyCreateBatchSchema } from '../__fixtures__/typeorm/company/schemas/company-create-batch.schema.js';
import { companyCreateSchema } from '../__fixtures__/typeorm/company/schemas/company-create.schema.js';
import { companyPaginatedSchema } from '../__fixtures__/typeorm/company/schemas/company-paginated.schema.js';
import { companyUpdateSchema } from '../__fixtures__/typeorm/company/schemas/company-update.schema.js';
import { companySchema } from '../__fixtures__/typeorm/company/schemas/company.schema.js';
import { DeviceEntity } from '../__fixtures__/typeorm/device/device.entity.js';
import { deviceCreateSchema } from '../__fixtures__/typeorm/device/schemas/device-create.schema.js';
import { deviceSchema } from '../__fixtures__/typeorm/device/schemas/device.schema.js';
import { ormSqliteConfig } from '../__fixtures__/typeorm/orm.sqlite.config.js';
import { ProjectEntity } from '../__fixtures__/typeorm/project/project.entity.js';
import { Seeds } from '../__fixtures__/typeorm/seeds.js';
import { UserEntity } from '../__fixtures__/typeorm/users/user.entity.js';

// Create entity-specific operation classes
const CompanyOps = createCrudOperationClasses<CompanyEntity>(
  CRUD_TEST_COMPANY_ENTITY_NAME,
);
const DeviceOps = createCrudOperationClasses<DeviceEntity>(
  CRUD_TEST_DEVICE_ENTITY_NAME,
);

// Create entity-specific handlers with proper DI setup
const CompanyListHandler = createQueryHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudListHandler,
  queryClass: CompanyOps.CrudListQuery,
});
const CompanyReadHandler = createQueryHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudReadHandler,
  queryClass: CompanyOps.CrudReadQuery,
});
const CompanyCreateHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudCreateHandler,
  commandClass: CompanyOps.CrudCreateCommand,
});
const CompanyCreateBatchHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudCreateBatchHandler,
  commandClass: CompanyOps.CrudCreateBatchCommand,
});
const CompanyUpdateHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudUpdateHandler,
  commandClass: CompanyOps.CrudUpdateCommand,
});
const CompanyReplaceHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudReplaceHandler,
  commandClass: CompanyOps.CrudReplaceCommand,
});
const CompanyDeleteHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudDeleteHandler,
  commandClass: CompanyOps.CrudDeleteCommand,
});
const CompanySoftDeleteHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudSoftDeleteHandler,
  commandClass: CompanyOps.CrudSoftDeleteCommand,
});
const CompanyRestoreHandler = createCommandHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudRestoreHandler,
  commandClass: CompanyOps.CrudRestoreCommand,
});

const DeviceCreateHandler = createCommandHandler({
  entity: CRUD_TEST_DEVICE_ENTITY_NAME,
  baseClass: CrudCreateHandler,
  commandClass: DeviceOps.CrudCreateCommand,
});

const isMysql = process.env.TYPEORM_CONNECTION === 'mysql';

// tslint:disable:max-classes-per-file no-shadowed-variable
describe('#crud-typeorm', () => {
  describe('#basic crud respects global limit', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;

    @CrudController({
      path: 'companies0',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: { body: companySchema },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    @CrudLimit(3)
    class CompaniesController0 {
      constructor(
        @Inject(CrudAdapterResolver)
        public crudResolver: CrudResolverInterface,
      ) {}

      @CrudList({ query: CompanyOps.CrudListQuery })
      list(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              { key: CRUD_TEST_COMPANY_ENTITY_NAME, entity: CompanyEntity },
            ],
          }),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController0],
        providers: [
          createCrudAdapterProvider({
            entity: CRUD_TEST_COMPANY_ENTITY_NAME,
            adapter: CrudAdapter,
          }),
          CompanyListHandler,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#list', () => {
      it('should return an array of all entities', async () => {
        const res = await request(server).get('/companies0').expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 3,
          total: 9,
          page: 1,
          pageCount: 3,
          limit: 3,
        });
        expect(res.body.data).toHaveLength(3);
      });
    });
  });

  describe('#basic crud default', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudQueryBuilder;

    @CrudController({
      path: 'companies',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: { body: companySchema },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    class CompaniesController {
      constructor(
        @Inject(CrudAdapterResolver)
        public crudResolver: CrudResolverInterface,
      ) {}

      @CrudList({ query: CompanyOps.CrudListQuery })
      list(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              { key: CRUD_TEST_COMPANY_ENTITY_NAME, entity: CompanyEntity },
            ],
          }),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController],
        providers: [
          createCrudAdapterProvider({
            entity: CRUD_TEST_COMPANY_ENTITY_NAME,
            adapter: CrudAdapter,
          }),
          CompanyListHandler,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    beforeEach(() => {
      qb = CrudQueryBuilder.create();
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#list', () => {
      it('should return an array of all entities', async () => {
        const res = await request(server).get('/companies').expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 9,
          total: 9,
          page: 1,
          pageCount: 1,
          limit: 9,
        });
        expect(res.body.data).toHaveLength(9);
      });
      it('should return an entities with limit', async () => {
        const res = await request(server)
          .get('/companies')
          .query(qb.setLimit(5).query())
          .expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 5,
          total: 9,
          page: 1,
          pageCount: 2,
          limit: 5,
        });
        expect(res.body.data).toHaveLength(5);
      });
      it('should return an entities with limit and page', async () => {
        const query = qb
          .setLimit(3)
          .setPage(1)
          .sortBy({ field: 'id', order: 'DESC' })
          .query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 3,
          total: 9,
          page: 1,
          pageCount: 3,
          limit: 3,
        });
        expect(res.body.data).toHaveLength(3);
      });
    });
  });

  describe('#basic crud', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudQueryBuilder;

    @CrudController({
      path: 'companies',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: companySchema,
        params: {
          id: {
            field: 'id',
            type: 'number',
            primary: true,
          },
        },
      },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    class CompaniesController {
      constructor(
        @Inject(CrudAdapterResolver)
        public crudResolver: CrudResolverInterface,
      ) {}

      @CrudList({ query: CompanyOps.CrudListQuery })
      list(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }

      @CrudRead({ query: CompanyOps.CrudReadQuery })
      read(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.read(context);
      }

      @CrudCreate({ command: CompanyOps.CrudCreateCommand })
      create(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateSchema })
        dto: z.infer<typeof companyCreateSchema>,
      ) {
        return this.crudResolver.create(context, dto);
      }

      @CrudCreateBatch({
        path: 'bulk',
        command: CompanyOps.CrudCreateBatchCommand,
        response: {
          serialization: { resource: companyCreateBatchResponseSchema },
        },
      })
      createBatch(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateBatchSchema })
        dto: z.infer<typeof companyCreateBatchSchema>,
      ) {
        return this.crudResolver.createBatch(context, dto);
      }

      @CrudUpdate({ command: CompanyOps.CrudUpdateCommand })
      update(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyUpdateSchema })
        dto: z.infer<typeof companyUpdateSchema>,
      ) {
        return this.crudResolver.update(context, dto);
      }

      @CrudReplace({ command: CompanyOps.CrudReplaceCommand })
      replace(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateSchema })
        dto: z.infer<typeof companyCreateSchema>,
      ) {
        return this.crudResolver.replace(context, dto);
      }

      @CrudDelete({
        response: { returnDeleted: true },
        command: CompanyOps.CrudDeleteCommand,
      })
      delete(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.delete(context);
      }

      @CrudSoftDelete({
        path: ':id/soft',
        response: { returnDeleted: true },
        command: CompanyOps.CrudSoftDeleteCommand,
      })
      softDelete(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.softDelete(context);
      }

      @CrudRestore({
        path: ':id/restore',
        command: CompanyOps.CrudRestoreCommand,
      })
      restore(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.restore(context);
      }

      @CrudRestore({
        path: ':id/restore-with-body',
        response: { returnRestored: true },
        command: CompanyOps.CrudRestoreCommand,
      })
      restoreWithBody(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
      ) {
        return this.crudResolver.restore(context);
      }

      @CrudDelete({
        path: ':id/silent',
        command: CompanyOps.CrudDeleteCommand,
      })
      deleteSilent(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.delete(context);
      }
    }

    @CrudController({
      path: 'devices',
      entity: CRUD_TEST_DEVICE_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: deviceSchema,
        params: {
          deviceKey: {
            field: 'deviceKey',
            type: 'uuid',
            primary: true,
          },
        },
      },
      response: { resource: deviceSchema },
    })
    class DevicesController {
      constructor(
        @Inject(CrudAdapterResolver)
        public crudResolver: CrudResolverInterface,
      ) {}

      @CrudCreate({
        command: DeviceOps.CrudCreateCommand,
      })
      create(
        @Ctx(CrudCtx) context: CrudContextInterface<DeviceEntity>,
        @CrudBody({ schema: deviceCreateSchema })
        dto: z.infer<typeof deviceCreateSchema>,
      ) {
        return this.crudResolver.create(context, dto);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({ ...ormSqliteConfig, logging: false }),
          TypeOrmModule.forFeature([ProjectEntity, UserEntity]),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              { key: CRUD_TEST_COMPANY_ENTITY_NAME, entity: CompanyEntity },
              { key: CRUD_TEST_DEVICE_ENTITY_NAME, entity: DeviceEntity },
            ],
          }),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController, DevicesController],
        providers: [
          createCrudAdapterProvider({
            entity: CRUD_TEST_COMPANY_ENTITY_NAME,
            adapter: CrudAdapter,
          }),
          createCrudAdapterProvider({
            entity: CRUD_TEST_DEVICE_ENTITY_NAME,
            adapter: CrudAdapter,
          }),
          CompanyListHandler,
          CompanyReadHandler,
          CompanyCreateHandler,
          CompanyCreateBatchHandler,
          CompanyUpdateHandler,
          CompanyReplaceHandler,
          CompanyDeleteHandler,
          CompanySoftDeleteHandler,
          CompanyRestoreHandler,
          DeviceCreateHandler,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    beforeEach(() => {
      qb = CrudQueryBuilder.create();
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#list', () => {
      it('should return an array of all entities', async () => {
        const res = await request(server)
          .get('/companies?includeDeleted=1')
          .expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 10,
          total: 10,
          page: 1,
          pageCount: 1,
          limit: 10,
        });
        expect(res.body.data).toHaveLength(10);
      });
      it('should return an entities with limit', async () => {
        const query = qb.setLimit(5).query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 5,
          total: 9,
          page: 1,
          pageCount: 2,
          limit: 5,
        });
        expect(res.body.data).toHaveLength(5);
      });
      it('should return an entities with limit and page', async () => {
        const query = qb
          .setLimit(3)
          .setPage(1)
          .sortBy({ field: 'id', order: 'DESC' })
          .query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        expect(res.body).toEqual({
          data: expect.any(Array),
          count: 3,
          total: 9,
          page: 1,
          pageCount: 3,
          limit: 3,
        });
        expect(res.body.data).toHaveLength(3);
      });
      it('should return an entities with offset', async () => {
        const queryObj = qb.setOffset(3);
        if (isMysql) {
          queryObj.setLimit(10);
        }
        const query = queryObj.query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        if (isMysql) {
          expect(res.body).toEqual({
            data: expect.any(Array),
            count: 6,
            total: 9,
            page: 1,
            pageCount: 1,
            limit: 10,
          });
          expect(res.body.data).toHaveLength(6);
        } else {
          expect(res.body).toEqual({
            data: expect.any(Array),
            count: 6,
            total: 9,
            page: 1,
            pageCount: 1,
            limit: 9,
          });
          expect(res.body.data).toHaveLength(6);
        }
      });
    });

    describe('#read', () => {
      it('should return status 404', () => {
        return request(server).get('/companies/333').expect(404);
      });
      it('should return status 404 for deleted entity', () => {
        return request(server).get('/companies/9').expect(404);
      });
      it('should return a deleted entity if includeDeleted query param is specified', () => {
        return request(server)
          .get('/companies/9?includeDeleted=1')
          .expect(200)
          .expect({
            id: 9,
            name: 'Name9',
            domain: 'Domain9',
            description: null,
          });
      });
      it('should return an entity, 1', () => {
        return request(server).get('/companies/1').expect(200).expect({
          id: 1,
          name: 'Name1',
          domain: 'Domain1',
          description: null,
        });
      });
      it('should return an entity, 2', () => {
        const query = qb.select(['domain']).query();
        return request(server)
          .get('/companies/1')
          .query(query)
          .expect(200)
          .expect({
            id: 1,
            name: 'Name1',
            domain: 'Domain1',
            description: null,
          });
      });
    });

    describe('#create', () => {
      it('should return status 400', () => {
        return request(server).post('/companies').send('').expect(400);
      });
      it('should return saved entity', async () => {
        const dto = {
          name: 'test0',
          domain: 'test0',
        };
        const res = await request(server)
          .post('/companies')
          .send(dto)
          .expect(201);
        expect(res.body).toEqual({
          id: expect.any(Number),
          name: 'test0',
          domain: 'test0',
          description: null,
        });
      });
      it('should return saved entity with description', async () => {
        const dto = {
          name: 'test_verify',
          domain: 'test_verify',
          description: 'test_desc',
        };
        const res = await request(server)
          .post('/companies')
          .send(dto)
          .expect(201);
        expect(res.body).toEqual({
          id: expect.any(Number),
          name: 'test_verify',
          domain: 'test_verify',
          description: 'test_desc',
        });
      });
    });

    describe('#createBatch', () => {
      it('should return status 400', () => {
        return request(server)
          .post('/companies/bulk')
          .send({ bulk: [] })
          .expect(400);
      });
      it('should return created entities with matching fields', async () => {
        const dto = {
          bulk: [
            { name: 'test1', domain: 'test1' },
            { name: 'test2', domain: 'test2' },
          ],
        };
        const res = await request(server)
          .post('/companies/bulk')
          .send(dto)
          .expect(201);
        expect(res.body).toEqual([
          {
            id: expect.any(Number),
            name: 'test1',
            domain: 'test1',
            description: null,
          },
          {
            id: expect.any(Number),
            name: 'test2',
            domain: 'test2',
            description: null,
          },
        ]);
      });
    });

    describe('#update', () => {
      it('should return status 404', () => {
        return request(server)
          .patch('/companies/333')
          .send({ name: 'updated0' })
          .expect(404);
      });
      it('should return updated entity, 1', () => {
        return request(server)
          .patch('/companies/1')
          .send({ name: 'updated0' })
          .expect(200)
          .expect({
            id: 1,
            name: 'updated0',
            domain: 'Domain1',
            description: null,
          });
      });
      it('should preserve unmodified fields', () => {
        return request(server)
          .patch('/companies/2')
          .send({ name: 'updated2' })
          .expect(200)
          .expect({
            id: 2,
            name: 'updated2',
            domain: 'Domain2',
            description: null,
          });
      });
      it('should return status 409 when updating a soft-deleted entity, even with includeDeleted', () => {
        return request(server)
          .patch('/companies/9?includeDeleted=1')
          .send({ name: 'updated9' })
          .expect(409);
      });
    });

    describe('#replace', () => {
      it('should return 404 for non-existent entity', () => {
        return request(server)
          .put('/companies/333')
          .send({ name: 'updated0', domain: 'domain0' })
          .expect(404);
      });
      it('should return updated entity, 1', () => {
        return request(server)
          .put('/companies/1')
          .send({ name: 'replaced0', domain: 'ReplacedDomain' })
          .expect(200)
          .expect({
            id: 1,
            name: 'replaced0',
            domain: 'ReplacedDomain',
            description: null,
          });
      });
    });

    describe('#delete (hard delete)', () => {
      it('should return status 404 for non-existent entity', () => {
        return request(server).delete('/companies/3333').expect(404);
      });
      it('should permanently delete entity and return it', () => {
        return request(server).delete('/companies/8').expect(200).expect({
          name: 'Name8',
          domain: 'Domain8',
          description: null,
        });
      });
      it('should not return permanently deleted entity', () => {
        return request(server).get('/companies/8').expect(404);
      });
      it('should not return permanently deleted entity even with includeDeleted', () => {
        return request(server).get('/companies/8?includeDeleted=1').expect(404);
      });
      it('should delete without body (returnDeleted=false)', () => {
        return request(server)
          .delete('/companies/7/silent')
          .expect(204)
          .expect('');
      });
    });

    describe('#softDelete', () => {
      it('should return status 404 for non-existent entity', () => {
        return request(server).delete('/companies/3333/soft').expect(404);
      });
      it('should softly delete entity and return it', () => {
        return request(server).delete('/companies/5/soft').expect(200).expect({
          id: 5,
          name: 'Name5',
          domain: 'Domain5',
          description: null,
        });
      });
      it('should not return softly deleted entity', () => {
        return request(server).get('/companies/5').expect(404);
      });
      it('should restore softly deleted entity without body (returnRestored=false)', () => {
        return request(server)
          .patch('/companies/5/restore')
          .expect(204)
          .expect('');
      });
      it('should return restored entity via read', () => {
        return request(server).get('/companies/5').expect(200).expect({
          id: 5,
          name: 'Name5',
          domain: 'Domain5',
          description: null,
        });
      });
      it('should restore and return entity (returnRestored=true)', async () => {
        // Soft-delete company 6 first, then restore with body
        await request(server).delete('/companies/6/soft').expect(200);
        const res = await request(server)
          .patch('/companies/6/restore-with-body')
          .expect(200);

        expect(res.body).toEqual({
          id: 6,
          name: 'Name6',
          domain: 'Domain6',
          description: null,
        });

        // Verify entity is actually restored (not stale soft-deleted data)
        await request(server).get('/companies/6').expect(200).expect({
          id: 6,
          name: 'Name6',
          domain: 'Domain6',
          description: null,
        });
      });
    });

    describe('#device create (UUID primary key)', () => {
      it('should create device with auto-generated UUID', async () => {
        const res = await request(server)
          .post('/devices')
          .send({ description: 'Test device' })
          .expect(201);
        expect(res.body).toEqual({
          deviceKey: expect.any(String),
          description: 'Test device',
        });
        expect(z.uuid().safeParse(res.body.deviceKey).success).toBe(true);
      });

      // Regression test for #466: a create body that validates to `{}` was
      // rejected with a bare 400 even though `deviceCreateSchema` declares
      // every field optional — every column here is server-populated.
      it('should create device with an empty body (issue #466)', async () => {
        const res = await request(server).post('/devices').send({}).expect(201);
        expect(res.body).toEqual({
          deviceKey: expect.any(String),
          description: null,
        });
        expect(z.uuid().safeParse(res.body.deviceKey).success).toBe(true);
      });
    });
  });

  describe('#transactions', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let datasource: DataSource;

    // Track if context.trx was set
    let trxWasSet = false;

    // Controller that verifies @Transactional sets context.trx
    @CrudController({
      path: 'tx-companies',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: companySchema,
        params: {
          id: { field: 'id', type: 'number', primary: true },
        },
      },
      response: { resource: companySchema },
    })
    class TxCompaniesController {
      constructor(
        @Inject(CrudAdapterResolver)
        public crudResolver: CrudResolverInterface,
      ) {}

      @CrudCreate({ command: CompanyOps.CrudCreateCommand })
      @Transactional()
      async create(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateSchema })
        dto: z.infer<typeof companyCreateSchema>,
      ) {
        // Record whether trx was set by the interceptor
        trxWasSet = (context as unknown as { trx: unknown }).trx !== null;
        return this.crudResolver.create(context, dto);
      }

      @CrudCreate({
        path: 'with-error',
        command: CompanyOps.CrudCreateCommand,
      })
      @Transactional()
      async createWithError(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateSchema })
        dto: z.infer<typeof companyCreateSchema>,
      ) {
        await this.crudResolver.create(context, dto);
        // Throw error after create to trigger rollback
        throw new Error('Intentional rollback');
      }

      @CrudCreate({
        path: 'multiple-with-error',
        command: CompanyOps.CrudCreateCommand,
        // This handler returns { first, second, third } (three whole
        // companies), not a single companySchema-shaped resource, so the
        // controller-level response.resource schema doesn't apply here —
        // give this operation its own matching response schema, same
        // reasoning as the CreateBatch array response above.
        response: {
          serialization: {
            resource: z.object({
              first: companySchema,
              second: companySchema,
              third: companySchema,
            }),
          },
        },
      })
      @Transactional()
      async createMultipleWithError(
        @Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>,
        @CrudBody({ schema: companyCreateSchema })
        dto: z.infer<typeof companyCreateSchema>,
      ) {
        // Create first entity - get back the created entity with ID
        const first = await this.crudResolver.create<CompanyEntity>(context, {
          ...dto,
          name: `${dto.name}_first`,
          domain: 'test1.com',
        });

        // Create second entity
        const second = await this.crudResolver.create<CompanyEntity>(context, {
          ...dto,
          name: `${dto.name}_second`,
          domain: 'test2.com',
        });

        // Create third entity
        const third = await this.crudResolver.create<CompanyEntity>(context, {
          ...dto,
          name: `${dto.name}_third`,
          domain: 'test3.com',
        });

        // Verify all entities were created (have IDs assigned by DB)
        if (!first.id || !second.id || !third.id) {
          throw new Error('Entities were not created properly');
        }

        // Return all - transaction should COMMIT
        return { first, second, third };
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({ ...ormSqliteConfig, logging: false }),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              { key: CRUD_TEST_COMPANY_ENTITY_NAME, entity: CompanyEntity },
            ],
          }),
          CrudModule.forRoot({}),
        ],
        controllers: [TxCompaniesController],
        providers: [
          createCrudAdapterProvider({
            entity: CRUD_TEST_COMPANY_ENTITY_NAME,
            adapter: CrudAdapter,
          }),
          CompanyCreateHandler,
        ],
      }).compile();

      app = fixture.createNestApplication();
      await app.init();
      server = app.getHttpServer();
      datasource = app.get<DataSource>(getDataSourceToken());
    });

    beforeEach(() => {
      trxWasSet = false;
    });

    afterAll(async () => {
      await app.close();
    });

    it('should set context.trx when @Transactional is used', async () => {
      const uniqueName = `TxTest_${Date.now()}`;

      const res = await request(server)
        .post('/tx-companies')
        .send({ name: uniqueName, domain: 'test.com', description: 'test' });

      expect(res.status).toBe(201);
      expect(trxWasSet).toBe(true);
    });

    it('should rollback on error when @Transactional is used', async () => {
      const uniqueName = `TxRollbackTest_${Date.now()}`;

      // Attempt to create - should fail with our intentional error
      const res = await request(server)
        .post('/tx-companies/with-error')
        .send({ name: uniqueName, domain: 'test.com', description: 'test' });

      expect(res.status).toBe(500);

      // Verify the entity was NOT persisted (transaction rolled back)
      const found = await datasource
        .getRepository(CompanyEntity)
        .findOne({ where: { name: uniqueName } });

      expect(found).toBeNull();
    });

    it('should commit ALL entities when transaction succeeds', async () => {
      const uniquePrefix = `TxMultiCommit_${Date.now()}`;

      // Create multiple entities - all 3 should be committed
      const res = await request(server)
        .post('/tx-companies/multiple-with-error')
        .send({
          name: uniquePrefix,
          domain: 'test.com',
          description: 'test',
        });

      expect(res.status).toBe(201);

      // Verify ALL entities were persisted (committed)
      const first = await datasource
        .getRepository(CompanyEntity)
        .findOne({ where: { name: `${uniquePrefix}_first` } });
      const second = await datasource
        .getRepository(CompanyEntity)
        .findOne({ where: { name: `${uniquePrefix}_second` } });
      const third = await datasource
        .getRepository(CompanyEntity)
        .findOne({ where: { name: `${uniquePrefix}_third` } });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(third).not.toBeNull();
    });
  });
});

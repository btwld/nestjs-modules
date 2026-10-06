import request from 'supertest';
import { DataSource } from 'typeorm';

import { Inject, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { Ctx } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudListHandler } from '../application/queries/handlers/crud-list.handler.js';
import { createQueryHandler } from '../application/utils/create-operation-handlers.js';
import { CrudModule } from '../crud.module.js';
import { CrudAdapter } from '../infrastructure/adapters/crud.adapter.js';
import { CrudController } from '../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudList } from '../infrastructure/decorators/operations/crud-list.decorator.js';
import { CrudJoin } from '../infrastructure/decorators/routes/crud-join.decorator.js';
import { CrudLimit } from '../infrastructure/decorators/routes/crud-limit.decorator.js';
import { CrudSort } from '../infrastructure/decorators/routes/crud-sort.decorator.js';
import { CrudCtx } from '../infrastructure/interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { CrudAdapterResolver } from '../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import { createCrudAdapterProvider } from '../infrastructure/utils/create-crud-adapter-provider.js';

import { createCrudOperationClasses } from '../__fixtures__/crud/create-crud-operation-classes.fixture.js';
import {
  CRUD_TEST_COMPANY_ENTITY_NAME,
  CRUD_TEST_USER_ENTITY_NAME,
} from '../__fixtures__/crud-test.constants.js';
import { CompanyEntity } from '../__fixtures__/typeorm/company/company.entity.js';
import { companyPaginatedSchema } from '../__fixtures__/typeorm/company/schemas/company-paginated.schema.js';
import { companySchema } from '../__fixtures__/typeorm/company/schemas/company.schema.js';
import { ormSqliteConfig } from '../__fixtures__/typeorm/orm.sqlite.config.js';
import { Seeds } from '../__fixtures__/typeorm/seeds.js';
import { UserEntity } from '../__fixtures__/typeorm/users/user.entity.js';

const CompanyOps = createCrudOperationClasses<CompanyEntity>(
  CRUD_TEST_COMPANY_ENTITY_NAME,
);
const UserOps = createCrudOperationClasses<UserEntity>(
  CRUD_TEST_USER_ENTITY_NAME,
);

const CompanyListHandler = createQueryHandler({
  entity: CRUD_TEST_COMPANY_ENTITY_NAME,
  baseClass: CrudListHandler,
  queryClass: CompanyOps.CrudListQuery,
});
const UserListHandler = createQueryHandler({
  entity: CRUD_TEST_USER_ENTITY_NAME,
  baseClass: CrudListHandler,
  queryClass: UserOps.CrudListQuery,
});

/**
 * E2E tests for federated CRUD queries through the controller layer.
 *
 * Company → Users is a one-to-many relationship. With `federated: true`
 * in forFeature(), the orchestrator issues separate queries and hydrates
 * the results — no DB-level JOIN.
 */
describe('#federated-crud', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  @CrudController({
    path: 'companies',
    entity: CRUD_TEST_COMPANY_ENTITY_NAME,
    adapter: CrudAdapter,
    response: { resource: companySchema, paginated: companyPaginatedSchema },
  })
  @CrudJoin([{ relation: 'users' }])
  @CrudSort([{ field: 'id', order: 'ASC' }])
  @CrudLimit(10)
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
            {
              key: CRUD_TEST_COMPANY_ENTITY_NAME,
              entity: CompanyEntity,
              relations: {
                users: { federated: true },
              },
            },
            { key: CRUD_TEST_USER_ENTITY_NAME, entity: UserEntity },
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
        createCrudAdapterProvider({
          entity: CRUD_TEST_USER_ENTITY_NAME,
          adapter: CrudAdapter,
        }),
        CompanyListHandler,
        UserListHandler,
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

  describe('#list with federated join', () => {
    it('should hydrate users array on each company', async () => {
      const res = await request(server).get('/companies?limit=10').expect(200);

      // Pagination metadata
      expect(res.body.count).toBe(9);
      expect(res.body.total).toBe(9);
      expect(res.body.page).toBe(1);
      expect(res.body.pageCount).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.data).toHaveLength(9);

      // Company 1 has users 1-10 (10 users)
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].name).toBe('Name1');
      expect(res.body.data[0].users).toHaveLength(10);
      expect(res.body.data[0].users[0].email).toBe('1@email.com');
      expect(res.body.data[0].users[0].companyId).toBe(1);

      // Company 2 has users 11-21 (11 users)
      expect(res.body.data[1].id).toBe(2);
      expect(res.body.data[1].name).toBe('Name2');
      expect(res.body.data[1].users).toHaveLength(11);
      expect(res.body.data[1].users[0].email).toBe('11@email.com');
      expect(res.body.data[1].users[0].companyId).toBe(2);

      // Companies 3-8, 10 have no users → empty array (LEFT JOIN)
      for (let i = 2; i < 9; i++) {
        expect(res.body.data[i].users).toEqual([]);
      }
    });

    it('should return correct pagination with federation (page 1)', async () => {
      const res = await request(server)
        .get('/companies?limit=5&page=1')
        .expect(200);

      expect(res.body.count).toBe(5);
      expect(res.body.total).toBe(9);
      expect(res.body.page).toBe(1);
      expect(res.body.pageCount).toBe(2);
      expect(res.body.limit).toBe(5);
      expect(res.body.data).toHaveLength(5);

      // Page 1: companies 1-5 (sorted by id ASC)
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].users).toHaveLength(10);
      expect(res.body.data[1].id).toBe(2);
      expect(res.body.data[1].users).toHaveLength(11);
      expect(res.body.data[2].id).toBe(3);
      expect(res.body.data[2].users).toEqual([]);
      expect(res.body.data[3].id).toBe(4);
      expect(res.body.data[3].users).toEqual([]);
      expect(res.body.data[4].id).toBe(5);
      expect(res.body.data[4].users).toEqual([]);
    });

    it('should return correct pagination with federation (page 2)', async () => {
      const res = await request(server)
        .get('/companies?limit=5&page=2')
        .expect(200);

      expect(res.body.count).toBe(4);
      expect(res.body.total).toBe(9);
      expect(res.body.page).toBe(2);
      expect(res.body.pageCount).toBe(2);
      expect(res.body.limit).toBe(5);
      expect(res.body.data).toHaveLength(4);

      // Page 2: companies 6-8, 10 (company 9 soft-deleted)
      expect(res.body.data[0].id).toBe(6);
      expect(res.body.data[0].users).toEqual([]);
      expect(res.body.data[1].id).toBe(7);
      expect(res.body.data[1].users).toEqual([]);
      expect(res.body.data[2].id).toBe(8);
      expect(res.body.data[2].users).toEqual([]);
      expect(res.body.data[3].id).toBe(10);
      expect(res.body.data[3].users).toEqual([]);
    });
  });
});

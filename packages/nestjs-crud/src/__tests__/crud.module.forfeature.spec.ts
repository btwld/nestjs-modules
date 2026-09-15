import request from 'supertest';
import { DataSource } from 'typeorm';
import { z } from 'zod';

import { Get, Inject, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { Ctx, Operation } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
} from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { CrudUpdateHandler } from '../application/commands/handlers/crud-update.handler.js';
import { CrudListHandler } from '../application/queries/handlers/crud-list.handler.js';
import { CrudListQuery } from '../application/queries/impl/crud-list.query.js';
import { CrudModule } from '../crud.module.js';
import { CrudAdapter } from '../infrastructure/adapters/crud.adapter.js';
import { CrudController } from '../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudCreate } from '../infrastructure/decorators/operations/crud-create.decorator.js';
import { CrudList } from '../infrastructure/decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../infrastructure/decorators/operations/crud-read.decorator.js';
import { CrudUpdate } from '../infrastructure/decorators/operations/crud-update.decorator.js';
import { CrudCtx } from '../infrastructure/interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { CrudAdapterResolver } from '../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudOperationResolver } from '../infrastructure/resolvers/crud-operation.resolver.js';
import { CrudResolverInterface } from '../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import { CrudMetaview } from '../infrastructure/services/crud-metaview.service.js';
import { getDynamicAdapterToken } from '../infrastructure/utils/crud-infra.utils.js';

import { CRUD_TEST_COMPANY_ENTITY_NAME } from '../__fixtures__/crud-test.constants.js';
import { CompanyEntity } from '../__fixtures__/typeorm/company/company.entity.js';
import { companyPaginatedSchema } from '../__fixtures__/typeorm/company/schemas/company-paginated.schema.js';
import { companySchema } from '../__fixtures__/typeorm/company/schemas/company.schema.js';
import { ormSqliteConfig } from '../__fixtures__/typeorm/orm.sqlite.config.js';
import { Seeds } from '../__fixtures__/typeorm/seeds.js';

describe('CrudModule.forFeature', () => {
  /**
   * Test 1: 100% Configuration
   *
   * This test verifies that forFeature can create a fully functional CRUD
   * controller entirely from configuration - no custom controller class needed.
   * The ConfigurableCrudBuilder generates the class, methods, and applies
   * all decorators including `\@Ctx` parameter decorators.
   */
  describe('100% configuration (generated controller)', () => {
    let testModule: TestingModule;
    let app: INestApplication;
    let generatedController: unknown;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: {
                path: 'companies',
                entity: CRUD_TEST_COMPANY_ENTITY_NAME,
                adapter: CrudAdapter,
                request: {
                  body: companySchema,
                  params: {
                    id: { field: 'id', type: 'number', primary: true },
                  },
                },
                response: {
                  resource: companySchema,
                  paginated: companyPaginatedSchema,
                },
              },
              operations: [
                { operation: Operation.List },
                { operation: Operation.Read },
              ],
            },
          }),
        ],
      }).compile();

      app = testModule.createNestApplication();
      await app.init();

      // Seed the database
      const datasource = testModule.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());

      // Get the generated controller from the module container
      const container = (
        testModule as unknown as {
          container: {
            modules: Map<
              unknown,
              { controllers: Map<unknown, { instance: unknown }> }
            >;
          };
        }
      ).container;
      for (const module of container.modules.values()) {
        for (const [, wrapper] of module.controllers) {
          if (
            wrapper.instance?.constructor?.name ===
            `${CRUD_TEST_COMPANY_ENTITY_NAME}Controller`
          ) {
            generatedController = wrapper.instance;
            break;
          }
        }
      }
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should create adapter provider', () => {
      const adapter = testModule.get(
        getDynamicAdapterToken(CRUD_TEST_COMPANY_ENTITY_NAME),
      );
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(CrudAdapter);
    });

    it('should generate a controller class', () => {
      expect(generatedController).toBeDefined();
      expect(generatedController?.constructor?.name).toBe(
        `${CRUD_TEST_COMPANY_ENTITY_NAME}Controller`,
      );
    });

    it('should have correct entity metadata on generated controller', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const entity = reflectionService.getEntity(
        generatedController!.constructor,
      );
      expect(entity).toBe(CRUD_TEST_COMPANY_ENTITY_NAME);
    });

    it('should have correct adapter metadata on generated controller', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const adapter = reflectionService.getAdapter(
        generatedController!.constructor,
      );
      // Generated controllers store adapter as a FactoryProvider
      expect(adapter).toMatchObject({
        provide: getDynamicAdapterToken(CRUD_TEST_COMPANY_ENTITY_NAME),
        inject: [getDynamicRepositoryToken(CRUD_TEST_COMPANY_ENTITY_NAME)],
      });
      expect(adapter).toHaveProperty('useFactory');
    });

    it('should have list method with List operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const proto = generatedController as Record<string, CallableFunction>;
      const operation = reflectionService.getOperation(proto.list);
      expect(operation).toBe(Operation.List);
    });

    it('should have read method with Read operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const proto = generatedController as Record<string, CallableFunction>;
      const operation = reflectionService.getOperation(proto.read);
      expect(operation).toBe(Operation.Read);
    });

    it('should respond to GET /companies', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/companies');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should respond to GET /companies/:id', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/companies/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });
  });

  /**
   * Test 2: Pre-decorated Controller Class
   *
   * This test verifies that forFeature correctly handles a controller class
   * that is already fully decorated with `\@CrudController`, operation decorators,
   * and parameter decorators. The forFeature extracts handlers from the
   * decorated methods and creates the adapter provider.
   */
  describe('pre-decorated controller class', () => {
    // Pre-decorated controller with all necessary decorators
    @CrudController({
      path: 'company-b',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: companySchema,
        params: { id: { field: 'id', type: 'number', primary: true } },
      },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    class CompanyControllerB {
      constructor(
        @Inject(CrudAdapterResolver)
        private readonly crudResolver: CrudResolverInterface,
      ) {}

      @CrudList()
      list(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }

      @CrudRead()
      read(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.read(context);
      }

      @CrudRead({ path: 'custom/:id' })
      customRead(@Ctx(CrudCtx) context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.read(context);
      }
    }

    let testModule: TestingModule;
    let app: INestApplication;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: { class: CompanyControllerB },
            },
          }),
        ],
      }).compile();

      app = testModule.createNestApplication();
      await app.init();

      // Seed the database
      const datasource = testModule.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should register the controller', () => {
      const controller = testModule.get(CompanyControllerB);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CompanyControllerB);
    });

    it('should create adapter provider from controller metadata', () => {
      const adapter = testModule.get(
        getDynamicAdapterToken(CRUD_TEST_COMPANY_ENTITY_NAME),
      );
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(CrudAdapter);
    });

    it('should preserve entity metadata from @CrudController', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const entity = reflectionService.getEntity(CompanyControllerB);
      expect(entity).toBe(CRUD_TEST_COMPANY_ENTITY_NAME);
    });

    it('should preserve adapter metadata from @CrudController', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const adapter = reflectionService.getAdapter(CompanyControllerB);
      expect(adapter).toBe(CrudAdapter);
    });

    it('should have list method with List operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const operation = reflectionService.getOperation(
        CompanyControllerB.prototype.list,
      );
      expect(operation).toBe(Operation.List);
    });

    it('should have read method with Read operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const operation = reflectionService.getOperation(
        CompanyControllerB.prototype.read,
      );
      expect(operation).toBe(Operation.Read);
    });

    it('should respond to GET /company-b', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-b');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should respond to GET /company-b/:id', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-b/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('should respond to non-standard method name GET /company-b/custom/:id', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-b/custom/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('should have customRead method with Read operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const operation = reflectionService.getOperation(
        CompanyControllerB.prototype.customRead,
      );
      expect(operation).toBe(Operation.Read);
    });
  });

  /**
   * Test 3: Hybrid Controller Class with Operations
   *
   * This test verifies the hybrid pattern where:
   * - User provides a minimal controller class with `\@CrudController`
   * - Methods have operation decorators but NO parameter decorators
   * - Operations augment existing methods and create missing ones
   *
   * Logic:
   * - If method exists with matching action → augment/override its options
   * - If method doesn't exist → create new method with implementation + decorators
   */
  describe('hybrid controller class with operations', () => {
    // Minimal controller - operation decorators but NO @Ctx/@CrudBody parameter decorators
    @CrudController({
      path: 'company-c',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: companySchema,
        params: { id: { field: 'id', type: 'number', primary: true } },
      },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    class CompanyControllerC {
      constructor(
        @Inject(CrudAdapterResolver)
        private readonly crudResolver: CrudResolverInterface,
      ) {}

      // Has @CrudList but NO @Ctx - forFeature will add parameter decorators
      @CrudList()
      list(context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }

      // Custom method name with operation decorator for read
      @CrudRead()
      findById(context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.read(context);
      }

      // Mutation method - has @CrudCreate but NO @Ctx/@CrudBody
      @CrudCreate()
      create(
        context: CrudContextInterface<CompanyEntity>,
        dto: Partial<CompanyEntity>,
      ) {
        return this.crudResolver.create(context, dto);
      }
    }

    let testModule: TestingModule;
    let app: INestApplication;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: { class: CompanyControllerC },
              operations: [
                // Augment existing list (operation matches)
                { operation: Operation.List },
                // Augment existing findById (operation matches, explicit methodName)
                { operation: Operation.Read, methodName: 'findById' },
                // Create new read (doesn't exist, uses default name)
                { operation: Operation.Read },
                // Augment existing create (mutation, operation matches)
                { operation: Operation.Create },
              ],
            },
          }),
        ],
      }).compile();

      app = testModule.createNestApplication();
      await app.init();

      // Seed the database
      const datasource = testModule.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should register the controller', () => {
      const controller = testModule.get(CompanyControllerC);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CompanyControllerC);
    });

    it('should create adapter provider', () => {
      const adapter = testModule.get(
        getDynamicAdapterToken(CRUD_TEST_COMPANY_ENTITY_NAME),
      );
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(CrudAdapter);
    });

    it('should have list method with List operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const action = reflectionService.getOperation(
        CompanyControllerC.prototype.list,
      );
      expect(action).toBe(Operation.List);
    });

    it('should have findById method with Read operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const action = reflectionService.getOperation(
        CompanyControllerC.prototype.findById,
      );
      expect(action).toBe(Operation.Read);
    });

    it('should have created read method with Read operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      // read should be created by forFeature since it didn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proto = CompanyControllerC.prototype as any;
      expect(proto.read).toBeDefined();
      const action = reflectionService.getOperation(proto.read);
      expect(action).toBe(Operation.Read);
    });

    it('should have create method with Create operation metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const action = reflectionService.getOperation(
        CompanyControllerC.prototype.create,
      );
      expect(action).toBe(Operation.Create);
    });

    it('should respond to GET /company-c (augmented list)', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-c');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should respond to GET /company-c/:id (created read)', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-c/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('should respond to POST /company-c (augmented create)', async () => {
      const server = app.getHttpServer();
      // This operation has no op-level request.body, so validation now
      // resolves the controller-level companySchema (full entity) through
      // the hierarchy, same as docs already did (#467) — description is
      // required (nullable, not optional) by that schema.
      const dto = {
        name: 'New Company',
        domain: 'new-company.com',
        description: null,
      };
      const res = await request(server).post('/company-c').send(dto);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('New Company');
    });
  });

  /**
   * Test 4: Custom Schema Override in Operations
   *
   * This test verifies that operations can override the controller-level
   * request body schema with a custom schema that has different validation
   * rules. The custom schema enforces stricter validation (e.g., max
   * length) that the default schema doesn't have.
   */
  describe('custom schema override in operations', () => {
    // Custom schema with stricter validation - name max 10 chars
    const strictCompanyCreateSchema = z.object({
      name: z.string().min(1).max(10),
      domain: z.string().min(1),
    });

    // Custom schema for updates - name max 5 chars
    const strictCompanyUpdateSchema = z.object({
      name: z.string().min(1).max(5),
      domain: z.string().min(1),
    });

    // Custom command handler that prefixes name with "Updated: "
    // No need for @Injectable or constructor - auto-injected if not provided
    class CustomUpdateHandler extends CrudUpdateHandler<CompanyEntity> {
      async execute(
        command: Parameters<CrudUpdateHandler<CompanyEntity>['execute']>[0],
      ): Promise<CompanyEntity> {
        // Modify the DTO before passing to parent
        const modifiedDto = {
          ...command.dto,
          name: `Updated: ${command.dto.name}`,
        };
        return super.execute({ ...command, dto: modifiedDto });
      }
    }

    // Custom query handler that transforms results by appending " (filtered)" to names
    class CustomListHandler extends CrudListHandler<CompanyEntity> {
      async execute(
        query: Parameters<CrudListHandler<CompanyEntity>['execute']>[0],
      ) {
        const result = await super.execute(query);
        return {
          ...result,
          data: result.data.map((company) => ({
            ...company,
            name: `${company.name} FILTERED`,
          })),
        };
      }
    }

    // Controller uses default companySchema at controller level
    // Uses CrudOperationResolver to invoke handlers directly
    @CrudController({
      path: 'company-d',
      entity: CRUD_TEST_COMPANY_ENTITY_NAME,
      adapter: CrudAdapter,
      request: {
        body: companySchema, // Default schema — no max length on name
        params: { id: { field: 'id', type: 'number', primary: true } },
      },
      response: { resource: companySchema, paginated: companyPaginatedSchema },
    })
    class CompanyControllerD {
      constructor(
        @Inject(CrudOperationResolver)
        private readonly crudResolver: CrudResolverInterface,
      ) {}

      @CrudList()
      list(context: CrudContextInterface<CompanyEntity>) {
        return this.crudResolver.list(context);
      }

      @CrudCreate()
      create(
        context: CrudContextInterface<CompanyEntity>,
        dto: Partial<CompanyEntity>,
      ) {
        return this.crudResolver.create(context, dto);
      }

      @CrudUpdate()
      update(
        context: CrudContextInterface<CompanyEntity>,
        dto: Partial<CompanyEntity>,
      ) {
        return this.crudResolver.update(context, dto);
      }
    }

    let testModule: TestingModule;
    let app: INestApplication;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: { class: CompanyControllerD },
              operations: [
                {
                  operation: Operation.List,
                  queryHandler: CustomListHandler,
                },
                {
                  operation: Operation.Create,
                  request: { body: strictCompanyCreateSchema },
                },
                {
                  operation: Operation.Update,
                  request: { body: strictCompanyUpdateSchema },
                  commandHandler: CustomUpdateHandler,
                },
              ],
            },
          }),
        ],
      }).compile();

      app = testModule.createNestApplication();
      await app.init();

      // Seed the database
      const datasource = testModule.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should have custom schema in create body param metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const bodyParams = reflectionService.getBodyParamOptions(
        CompanyControllerD.prototype.create,
      );
      expect(bodyParams).toBeDefined();
      expect(bodyParams?.length).toBe(1);
      expect(bodyParams?.[0]?.schema).toBe(strictCompanyCreateSchema);
    });

    it('should have custom schema in update body param metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const bodyParams = reflectionService.getBodyParamOptions(
        CompanyControllerD.prototype.update,
      );
      expect(bodyParams).toBeDefined();
      expect(bodyParams?.length).toBe(1);
      expect(bodyParams?.[0]?.schema).toBe(strictCompanyUpdateSchema);
    });

    it('should have custom command handler in update metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const handlerOptions = reflectionService.getCommandHandler(
        CompanyControllerD.prototype.update,
      );
      expect(handlerOptions).toBeDefined();
      expect(handlerOptions?.resolved).toBe(CustomUpdateHandler);
    });

    it('should have custom query handler in list metadata', () => {
      const reflectionService = new CrudMetaview<CompanyEntity>();
      const handlerOptions = reflectionService.getQueryHandler(
        CompanyControllerD.prototype.list,
      );
      expect(handlerOptions).toBeDefined();
      expect(handlerOptions?.resolved).toBe(CustomListHandler);
    });

    it('should reject data exceeding custom schema constraints', async () => {
      const server = app.getHttpServer();
      // Name is 20 chars - exceeds strictCompanyCreateSchema's max(10)
      const dto = { name: 'This Name Is Too Long', domain: 'toolong.com' };
      const res = await request(server).post('/company-d').send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'name: Too big: expected string to have <=10 characters',
      );
    });

    it('should accept valid data within custom schema constraints', async () => {
      const server = app.getHttpServer();
      // Name is 8 chars - within MaxLength(10) limit for create
      const dto = { name: 'ShortOne', domain: 'short.com' };
      const res = await request(server).post('/company-d').send(dto);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('ShortOne');
    });

    it('should reject update data exceeding custom schema constraints', async () => {
      const server = app.getHttpServer();
      // Name is 8 chars - exceeds strictCompanyUpdateSchema's max(5)
      const dto = { name: 'TooLong1', domain: 'updated.com' };
      const res = await request(server).patch('/company-d/1').send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'name: Too big: expected string to have <=5 characters',
      );
    });

    it('should use custom command handler for update', async () => {
      const server = app.getHttpServer();
      // Name is 5 chars - within MaxLength(5) limit for update
      // Custom handler prefixes with "Updated: "
      const dto = { name: 'Short', domain: 'updated.com' };
      const res = await request(server).patch('/company-d/1').send(dto);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('Updated: Short');
    });

    it('should use custom query handler for list', async () => {
      const server = app.getHttpServer();
      const res = await request(server).get('/company-d');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      // Custom handler appends " (filtered)" to each name
      res.body.data.forEach((company: CompanyEntity) => {
        expect(company.name).toMatch(/(FILTERED)$/);
      });
    });
  });

  describe('module compilation with controller config', () => {
    let testModule: TestingModule;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: {
                path: 'companies',
                entity: 'Company',
                adapter: CrudAdapter,
                request: { body: companySchema },
                response: {
                  resource: companySchema,
                  paginated: companyPaginatedSchema,
                },
              },
              operations: [
                { operation: Operation.List },
                { operation: Operation.Read },
              ],
            },
          }),
        ],
      }).compile();
    });

    afterAll(async () => {
      await testModule?.close();
    });

    it('should create adapter provider', () => {
      const adapter = testModule.get(getDynamicAdapterToken('Company'));
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(CrudAdapter);
    });
  });

  describe('module compilation with custom query handler', () => {
    class CustomListHandler extends CrudListHandler<CompanyEntity> {
      async execute(_query: CrudListQuery<CompanyEntity>) {
        const data: CompanyEntity[] = [];
        return { data, count: 0, page: 1, pageCount: 0, total: 0, limit: 10 };
      }
    }

    let testModule: TestingModule;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: {
                path: 'companies',
                entity: 'Company',
                adapter: CrudAdapter,
                request: { body: companySchema },
                response: {
                  resource: companySchema,
                  paginated: companyPaginatedSchema,
                },
              },
              operations: [
                {
                  operation: Operation.List,
                  queryHandler: CustomListHandler,
                },
                { operation: Operation.Read },
              ],
            },
          }),
        ],
      }).compile();
    });

    afterAll(async () => {
      await testModule?.close();
    });

    it('should create adapter provider', () => {
      const adapter = testModule.get(getDynamicAdapterToken('Company'));
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(CrudAdapter);
    });

    it('should register custom query handler', () => {
      const adapter = testModule.get(getDynamicAdapterToken('Company'));
      expect(adapter).toBeDefined();
    });
  });

  describe('module compilation with custom controller class', () => {
    @CrudController({
      path: 'companies',
      entity: 'Company',
      adapter: CrudAdapter,
      request: { body: companySchema },
      response: { resource: companySchema },
    })
    class CustomCompanyController {
      @Get('ping')
      ping(): string {
        return 'pong';
      }
    }

    let testModule: TestingModule;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          RepositoryModule.forRoot({}),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            entities: [
              {
                key: CRUD_TEST_COMPANY_ENTITY_NAME,
                entity: CompanyEntity,
              },
            ],
          }),
          CrudModule.forRoot({}),
          CrudModule.forFeature<CompanyEntity>({
            crud: {
              controller: { class: CustomCompanyController },
            },
          }),
        ],
      }).compile();
    });

    afterAll(async () => {
      await testModule?.close();
    });

    it('should register custom controller', () => {
      const controller = testModule.get(CustomCompanyController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CustomCompanyController);
      expect(controller.ping()).toBe('pong');
    });
  });
});

import supertest from 'supertest';

import { Param, ParseIntPipe, Query } from '@nestjs/common';
import { NestApplication } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { Ctx } from '@concepta/nestjs-core';
import {
  OrderSortKeyArr,
  RepositoryInterface,
  WhereConditionArr,
} from '@concepta/nestjs-repository';

import { TestCrudAdapter } from '../../../__fixtures__/crud/adapters/test-crud.adapter.js';
import { TestModel } from '../../../__fixtures__/crud/models/test.model.js';
import { testModelSchema } from '../../../__fixtures__/crud/schemas/test-model.schema.js';
import { CrudModule } from '../../../crud.module.js';
import { CrudController } from '../../decorators/controller/crud-controller.decorator.js';
import { CrudList } from '../../decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../../decorators/operations/crud-read.decorator.js';
import { CrudUpdate } from '../../decorators/operations/crud-update.decorator.js';
import { CrudQueryBuilder } from '../../request/crud-query.builder.js';
import { paginatedSchema } from '../../schemas/crud-response-paginated.schema.js';
import { CrudCtx } from '../crud-context.overlay.js';
import { CrudContextInterface } from '../interfaces/crud-context.interface.js';

// tslint:disable:max-classes-per-file
describe('#crud', () => {
  @CrudController({
    path: 'test',
    entity: 'Test',
    adapter: TestCrudAdapter,
    request: {
      params: {
        someParam: { field: 'age', type: 'number' },
      },
    },
    response: {
      resource: testModelSchema,
      // TestController has two @CrudList operations, so
      // apply-api-response.decorator.ts requires a matching (both-Zod)
      // paginated type even though these routes never actually return a
      // paginated shape (see below) — the mismatch check fires at
      // decoration time, unconditional on real response content.
      paginated: paginatedSchema(testModelSchema),
    },
  })
  class TestController {
    @CrudList({ path: '/query' })
    async query(@Ctx(CrudCtx) ctx: CrudContextInterface<TestModel>) {
      return { query: ctx.withCrud().query };
    }

    @CrudList({ path: '/other' })
    async other(@Query('page', ParseIntPipe) page: number) {
      return { page };
    }

    @CrudRead({ path: '/other2/:someParam' })
    async routeWithParam(@Param('someParam', ParseIntPipe) p: number) {
      return { p };
    }

    @CrudRead({ path: '/precondition/:someParam' })
    async precondition(@Ctx(CrudCtx) ctx: CrudContextInterface<TestModel>) {
      return { precondition: ctx.withCrud().precondition };
    }

    // No version column on this entity's mock metadata (see below) — an
    // `If-Match` naming a version here must 400, not reach this body.
    @CrudUpdate({ path: '/update/:someParam' })
    async update(@Ctx(CrudCtx) ctx: CrudContextInterface<TestModel>) {
      return { precondition: ctx.withCrud().precondition };
    }
  }

  @CrudController({
    path: 'test2',
    entity: 'Test2',
    adapter: TestCrudAdapter,
    request: {
      params: {
        id: { field: 'id', type: 'number' },
        someParam: { field: 'age', type: 'number' },
      },
    },
    response: {
      resource: testModelSchema,
    },
  })
  class Test2Controller {
    @CrudRead({ path: 'normal/:id' })
    async normal(@Ctx(CrudCtx) ctx: CrudContextInterface<TestModel>) {
      return { params: ctx.withCrud().params };
    }

    @CrudRead({ path: 'other2/:someParam' })
    async routeWithParam(@Param('someParam', ParseIntPipe) p: number) {
      return { p };
    }

    @CrudRead({
      path: 'other2/:id/twoParams/:someParam',
    })
    async twoParams(
      @Ctx(CrudCtx) ctx: CrudContextInterface<TestModel>,
      @Param('someParam', ParseIntPipe) _p: number,
    ) {
      return { params: ctx.withCrud().params };
    }
  }

  let $: ReturnType<typeof supertest>;
  let app: NestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      providers: [
        {
          provide: TestCrudAdapter,
          useFactory: () => {
            const mockRepo: RepositoryInterface<TestModel> = {
              metadata: {
                name: 'TestModel',
                type: TestModel,
                columns: [
                  {
                    name: 'id',
                    isPrimary: true,
                    isRemoveDate: false,
                    isVersion: false,
                  },
                  {
                    name: 'firstName',
                    isPrimary: false,
                    isRemoveDate: false,
                    isVersion: false,
                  },
                  {
                    name: 'lastName',
                    isPrimary: false,
                    isRemoveDate: false,
                    isVersion: false,
                  },
                ],
              },
              find: vi.fn(),
              findOne: vi.fn(),
              count: vi.fn(),
              findAndCount: vi.fn(),
              create: vi.fn(),
              createMany: vi.fn(),
              update: vi.fn(),
              upsert: vi.fn(),
              replace: vi.fn(),
              delete: vi.fn(),
              deleteMany: vi.fn(),
              softDelete: vi.fn(),
              restore: vi.fn(),
              transform: vi.fn(),
              merge: vi.fn(),
              prepare: vi.fn(),
            };
            return new TestCrudAdapter(mockRepo);
          },
        },
      ],
      controllers: [TestController, Test2Controller],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    $ = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('#interceptor', () => {
    let qb: CrudQueryBuilder;

    beforeEach(() => {
      qb = CrudQueryBuilder.create();
    });

    it('should working on non-crud controller', async () => {
      const page = 2;
      const limit = 10;
      const fields = ['a', 'b', 'c'];
      const sorts: OrderSortKeyArr<TestModel>[] = [
        ['firstName', 'ASC'],
        ['lastName', 'DESC'],
      ];
      const filters: WhereConditionArr<TestModel>[] = [
        ['id', 'in', [1, 2, 3]],
        ['firstName', 'eq', 'John'],
        ['lastName', 'nnull'],
      ];

      qb.setPage(page).setLimit(limit);
      qb.select(fields);
      for (const s of sorts) {
        qb.sortBy({ field: s[0], order: s[1] });
      }
      for (const f of filters) {
        qb.setFilter(f);
      }

      const res = await $.get('/test/query').query(qb.query()).expect(200);
      expect(res.body.query).toHaveProperty('page', page);
      expect(res.body.query).toHaveProperty('limit', limit);
      expect(res.body.query).toHaveProperty('fields', fields);
      expect(res.body.query).toHaveProperty('sort');
      for (let i = 0; i < sorts.length; i++) {
        expect(res.body.query.sort[i]).toHaveProperty('field', sorts[i][0]);
        expect(res.body.query.sort[i]).toHaveProperty('order', sorts[i][1]);
      }
      expect(res.body.query).toHaveProperty('filter');
      for (let i = 0; i < filters.length; i++) {
        expect(res.body.query.filter[i]).toHaveProperty('field', filters[i][0]);
        expect(res.body.query.filter[i]).toHaveProperty(
          'operator',
          filters[i][1],
        );
        if (filters[i][2] !== undefined) {
          expect(res.body.query.filter[i]).toHaveProperty(
            'value',
            filters[i][2],
          );
        }
      }
    });

    it('should others working', async () => {
      const res = await $.get('/test/other')
        .query({ page: 2, limit: 11 })
        .expect(200);
      expect(res.body.page).toBe(2);
    });

    it('should parse param', async () => {
      const res = await $.get('/test/other2/123').expect(200);
      expect(res.body.p).toBe(123);
    });

    it('should parse custom param in crud', async () => {
      const res = await $.get('/test2/other2/123').expect(200);
      expect(res.body.p).toBe(123);
    });

    it('should parse crud param and custom param', async () => {
      const res = await $.get('/test2/other2/1/twoParams/123').expect(200);
      expect(res.body.params).toHaveProperty('id', 1);
      expect(res.body.params).toHaveProperty('age', 123);
    });

    it('should work like before', async () => {
      const res = await $.get('/test2/normal/0').expect(200);
      expect(res.body.params).toHaveProperty('id', 0);
    });
  });

  describe('If-Match precondition parsing', () => {
    // `If-Match` only governs Update/Replace/Delete/SoftDelete/Restore — a
    // read route never computes `precondition` at all, regardless of what
    // header is sent, so a stale or malformed `If-Match` on a GET is
    // simply not evaluated rather than rejected.
    it('should never compute precondition on a read route, even with a header sent', async () => {
      const res = await $.get('/test/precondition/1')
        .set('If-Match', '"3"')
        .expect(200);
      expect(res.body.precondition).toBeUndefined();
    });

    // This fixture's mock metadata marks every column `isVersion: false`
    // (see the module setup above) — so a *well-formed* entity-tag on the
    // write route still 400s, just for a different reason (no version
    // column to check it against) than a malformed one (fails parsing
    // before that check ever runs). `undefined`/`*` never reach the
    // version-column lookup at all — `precondition?.version` is undefined
    // for both — so those two are the only cases observable as a 200 on a
    // version-less entity.

    it('should leave precondition undefined when no header is sent', async () => {
      const res = await $.patch('/test/update/1').expect(200);
      expect(res.body.precondition).toBeUndefined();
    });

    it('should parse * into an empty precondition without checking for a version column', async () => {
      const res = await $.patch('/test/update/1')
        .set('If-Match', '*')
        .expect(200);
      expect(res.body.precondition).toEqual({});
    });

    it.each(['W/"3"', '"3", "4"', '"abc"', '3'])(
      'should reject %s with 400 (fails parsing)',
      async (value) => {
        await $.patch('/test/update/1').set('If-Match', value).expect(400);
      },
    );

    it('should reject a well-formed "3" with 400 (parses fine, but no version column)', async () => {
      await $.patch('/test/update/1').set('If-Match', '"3"').expect(400);
    });
  });
});

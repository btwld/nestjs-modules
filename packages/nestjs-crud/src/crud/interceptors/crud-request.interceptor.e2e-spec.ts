import supertest from 'supertest';

import { Param, ParseIntPipe, Query, UseInterceptors } from '@nestjs/common';
import { NestApplication } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { TestCrudAdapter } from '../../__fixtures__/crud/adapters/test-crud.adapter';
import { TestModelDto } from '../../__fixtures__/crud/models/test.model';
import { CrudModule } from '../../crud.module';
import { CrudRequestQueryBuilder } from '../../request/crud-request-query.builder';
import {
  QueryFilterArr,
  QuerySortArr,
} from '../../request/types/crud-request-query.types';
import { CrudGetMany } from '../decorators/actions/crud-get-many.decorator';
import { CrudGetOne } from '../decorators/actions/crud-get-one.decorator';
import { CrudController } from '../decorators/controller/crud-controller.decorator';
import { CrudRequest } from '../decorators/params/crud-request.decorator';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';

import { CrudRequestInterceptor } from './crud-request.interceptor';

// tslint:disable:max-classes-per-file
describe('#crud', () => {
  @UseInterceptors(CrudRequestInterceptor)
  @CrudController({
    path: 'test',
    model: { type: TestModelDto },
    params: {
      someParam: { field: 'age', type: 'number' },
    },
    serialization: {
      toInstanceOptions: {
        excludeExtraneousValues: false,
        strategy: 'exposeAll',
      },
      toPlainOptions: {
        excludeExtraneousValues: false,
        strategy: 'exposeAll',
      },
    },
  })
  class TestController {
    @CrudGetMany({ path: '/query' })
    async query(@CrudRequest() req: CrudRequestInterface<TestModelDto>) {
      return req;
    }

    @CrudGetMany({ path: '/other' })
    async other(@Query('page', ParseIntPipe) page: number) {
      return { page };
    }

    @CrudGetOne({ path: '/other2/:someParam' })
    async routeWithParam(@Param('someParam', ParseIntPipe) p: number) {
      return { p };
    }
  }

  @CrudController({
    path: 'test2',
    model: { type: TestModelDto },
    params: {
      id: { field: 'id', type: 'number' },
      someParam: { field: 'age', type: 'number' },
    },
    serialization: {
      toInstanceOptions: {
        excludeExtraneousValues: false,
        strategy: 'exposeAll',
      },
      toPlainOptions: {
        excludeExtraneousValues: false,
        strategy: 'exposeAll',
      },
    },
  })
  class Test2Controller {
    constructor(public service: TestCrudAdapter<TestModelDto>) {}

    @UseInterceptors(CrudRequestInterceptor)
    @CrudGetOne({ path: 'normal/:id' })
    async normal(@CrudRequest() req: CrudRequestInterface<TestModelDto>) {
      return { filter: req.parsed.paramsFilter };
    }

    @UseInterceptors(CrudRequestInterceptor)
    @CrudGetOne({ path: 'other2/:someParam' })
    async routeWithParam(@Param('someParam', ParseIntPipe) p: number) {
      return { p };
    }

    @UseInterceptors(CrudRequestInterceptor)
    @CrudGetOne({ path: 'other2/:id/twoParams/:someParam' })
    async twoParams(
      @CrudRequest() req: CrudRequestInterface<TestModelDto>,
      @Param('someParam', ParseIntPipe) _p: number,
    ) {
      return { filter: req.parsed.paramsFilter };
    }
  }

  let $: supertest.SuperTest<supertest.Test>;
  let app: NestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      providers: [TestCrudAdapter],
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
    let qb: CrudRequestQueryBuilder;

    beforeEach(() => {
      qb = CrudRequestQueryBuilder.create();
    });

    it('should working on non-crud controller', async () => {
      const page = 2;
      const limit = 10;
      const fields = ['a', 'b', 'c'];
      const sorts: QuerySortArr<TestModelDto>[] = [
        ['firstName', 'ASC'],
        ['lastName', 'DESC'],
      ];
      const filters: QueryFilterArr<TestModelDto>[] = [
        ['id', '$in', [1, 2, 3]],
        ['firstName', '$eq', 'John'],
        ['lastName', '$notnull'],
      ];

      qb.setPage(page).setLimit(limit);
      qb.select(fields);
      for (const s of sorts) {
        qb.sortBy({ field: s[0], order: s[1] });
      }
      for (const f of filters) {
        qb.setFilter({ field: f[0], operator: f[1], value: f[2] });
      }

      const res = await $.get('/test/query').query(qb.query()).expect(200);
      expect(res.body.parsed).toHaveProperty('page', page);
      expect(res.body.parsed).toHaveProperty('limit', limit);
      expect(res.body.parsed).toHaveProperty('fields', fields);
      expect(res.body.parsed).toHaveProperty('sort');
      for (let i = 0; i < sorts.length; i++) {
        expect(res.body.parsed.sort[i]).toHaveProperty('field', sorts[i][0]);
        expect(res.body.parsed.sort[i]).toHaveProperty('order', sorts[i][1]);
      }
      expect(res.body.parsed).toHaveProperty('filter');
      for (let i = 0; i < filters.length; i++) {
        expect(res.body.parsed.filter[i]).toHaveProperty(
          'field',
          filters[i][0],
        );
        expect(res.body.parsed.filter[i]).toHaveProperty(
          'operator',
          filters[i][1],
        );
        expect(res.body.parsed.filter[i]).toHaveProperty(
          'value',
          filters[i][2] || '',
        );
      }
    });

    it('should others working', async () => {
      const res = await $.get('/test/other')
        .query({ page: 2, per_page: 11 })
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
      expect(res.body.filter).toHaveLength(2);
      expect(res.body.filter[0].field).toBe('id');
      expect(res.body.filter[0].value).toBe(1);
    });

    it('should work like before', async () => {
      const res = await $.get('/test2/normal/0').expect(200);
      expect(res.body.filter).toHaveLength(1);
      expect(res.body.filter[0].field).toBe('id');
      expect(res.body.filter[0].value).toBe(0);
    });
  });
});

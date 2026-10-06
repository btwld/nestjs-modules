import supertest from 'supertest';

import { Controller, Get } from '@nestjs/common';
import { NestApplication } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { CrudQueryParams } from '../crud-query-params.decorator.js';

// Proves `@CrudQueryParams()` works on a genuinely hand-written route: no
// `@CrudController()`, no `@CrudEntity()`, no `@Crud<Operation>` tag, and
// `CrudModule` isn't even imported — `CrudContextOverlay` (and `ctx.query`)
// never populates for a method like this, but this decorator doesn't need it.
describe('#crud CrudQueryParams (decoupled from CrudController)', () => {
  @Controller('search')
  class SearchController {
    @Get()
    search(@CrudQueryParams() query: unknown) {
      return { query };
    }
  }

  let $: ReturnType<typeof supertest>;
  let app: NestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SearchController],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    $ = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('should parse a valid query string on a bare hand-written route', async () => {
    const res = await $.get('/search')
      .query({ filter: 'firstName||$eq||John', limit: '5' })
      .expect(200);

    expect(res.body.query).toHaveProperty('limit', 5);
    expect(res.body.query.filter).toEqual([
      { field: 'firstName', operator: 'eq', value: 'John' },
    ]);
  });

  it('should reject a malformed query string with HTTP 400', async () => {
    await $.get('/search')
      .query({ filter: 'firstName||badop||John' })
      .expect(400);
  });
});

import supertest from 'supertest';

import { HttpStatus, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { ExceptionsFilter } from './exceptions.filter';

import { AppModuleFixture } from '../__fixtures__/exceptions/app.module.fixture';

describe('Exception (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new ExceptionsFilter(httpAdapterHost));

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  it('Should return unknown', async () => {
    const response = await supertest(app.getHttpServer()).get('/test/unknown');
    expect(response.body.statusCode).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.body.errorCode).toEqual('UNKNOWN');
    expect(response.body.message).toEqual('Internal Server Error');
  });

  it('Should return bad request', async () => {
    const response = await supertest(app.getHttpServer()).get(
      '/test/bad-request',
    );
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.errorCode).toEqual('HTTP_BAD_REQUEST');
    expect(response.body.message).toEqual('Bad Request');
  });

  it('Should fall back to safe message', async () => {
    const response = await supertest(app.getHttpServer()).get(
      '/test/safe-message-fallback',
    );
    expect(response.body.message).toEqual('This is a safe message');
  });

  it('Should return array of validation errors', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/test/bad-validation')
      .send({ id: 'not a number' });
    expect(response.body.statusCode).toEqual(HttpStatus.BAD_REQUEST);
    expect(response.body.errorCode).toEqual('HTTP_BAD_REQUEST');
    expect(typeof response.body.message).toEqual('object');
    expect(response.body.message).toEqual([
      'id must be a number conforming to the specified constraints',
    ]);
  });

  it('Should return not found', async () => {
    const response = await supertest(app.getHttpServer()).get('/test/123');
    expect(response.body.errorCode).toEqual('CUSTOM_NOT_FOUND');
    expect(response.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    expect(response.body.message).toEqual('Item with id 123 was not found.');
  });
});

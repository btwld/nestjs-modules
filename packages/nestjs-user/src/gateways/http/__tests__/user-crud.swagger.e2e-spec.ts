import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, type TestingModule } from '@nestjs/testing';

import { standardSchemaConverter } from '@concepta/nestjs-core';

import { AppModuleCrudFixture } from './fixtures/app-crud.module.fixture.js';

describe('UserController swagger (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleCrudFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    return app ? await app.close() : undefined;
  });

  it('registers User and UserPaginated as named, $ref-reused components', () => {
    const config = new DocumentBuilder()
      .setTitle('user')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      standardSchemaConverter,
    });

    expect(document.components?.schemas?.User).toBeDefined();
    expect(document.components?.schemas?.UserPaginated).toBeDefined();

    const readResponse =
      document.paths?.['/user/{id}']?.get?.responses?.['200'];
    const listResponse = document.paths?.['/user']?.get?.responses?.['200'];

    if (!readResponse || !('content' in readResponse)) {
      throw new Error(
        'expected the read response to be a content-bearing response object',
      );
    }
    if (!listResponse || !('content' in listResponse)) {
      throw new Error(
        'expected the list response to be a content-bearing response object',
      );
    }

    expect(readResponse.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/User',
    });
    expect(listResponse.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/UserPaginated',
    });
  });

  it('documents the schema-based POST request body inline, since userCreateSchema is not a named component (no withNamedComponent)', () => {
    const config = new DocumentBuilder()
      .setTitle('user')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      standardSchemaConverter,
    });

    const createBody = document.paths?.['/user']?.post?.requestBody;
    if (!createBody || !('content' in createBody)) {
      throw new Error(
        'expected the create request body to be a content-bearing request body object',
      );
    }

    const schema = createBody.content?.['application/json']?.schema;
    if (!schema || !('type' in schema)) {
      throw new Error('expected an inline object schema, not a $ref');
    }

    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    // userCreateSchema was never passed through withNamedComponent.
    expect(document.components?.schemas?.UserCreate).toBeUndefined();
  });
});

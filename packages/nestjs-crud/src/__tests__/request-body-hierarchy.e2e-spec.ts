import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { standardSchemaConverter } from '@concepta/nestjs-core';

import { type OperationObject } from './openapi-types.js';

import { AppPhotoBodyFallbackModuleFixture } from '../__fixtures__/app-photo-body-fallback.module.fixture.js';
import { default as ormConfig } from '../__fixtures__/ormconfig.fixture.js';

/**
 * Regression coverage for #467 — `PhotoBodyFallbackControllerFixture`
 * mirrors the reporter's config exactly: a `ConfigurableCrudBuilder`
 * fully-generated controller (no `design:paramtypes`, closing gate A) whose
 * Create operation declares NO op-level `request.body` (closing gate B via
 * the docs/validation hierarchy convergence) — the body exists only at
 * controller level, as `photoSchema` (a `withNamedComponent` schema).
 */
describe('CRUD request body — controller-level-only schema (#467)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(ormConfig),
        AppPhotoBodyFallbackModuleFixture,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    return app ? await app.close() : undefined;
  });

  it('documents the create body as a $ref to Photo, not inlined', () => {
    const doc: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('photo-body-fallback')
        .setVersion('1.0')
        .build(),
      { standardSchemaConverter },
    );

    const op = doc.paths['/photo-body-fallback']?.post as
      OperationObject | undefined;
    const schema = (
      op?.requestBody as
        { content?: { 'application/json'?: { schema?: unknown } } } | undefined
    )?.content?.['application/json']?.schema;

    expect(schema).toEqual({ $ref: '#/components/schemas/Photo' });
    expect(doc.components?.schemas?.Photo).toBeDefined();
  });

  it('groups the request body and response $refs into the same single Photo component', () => {
    const doc: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('photo-body-fallback')
        .setVersion('1.0')
        .build(),
      { standardSchemaConverter },
    );

    // exactly one component — no duplicate/renamed entry (e.g. "PhotoCreate")
    const matchingKeys = Object.keys(doc.components?.schemas ?? {}).filter(
      (key) => key === 'Photo',
    );
    expect(matchingKeys).toHaveLength(1);

    // the Create request body (via crud-init-api-body.decorator.ts's fixed
    // CrudInitApiBody path) AND the Create response (via the pre-existing
    // ApiResponse path) both $ref it — this is what actually regresses if
    // CrudInitApiBody reverts to raw pre-conversion, since the body ref
    // would disappear while the response ref survives.
    const refCount =
      JSON.stringify(doc).split('"$ref":"#/components/schemas/Photo"').length -
      1;
    expect(refCount).toBeGreaterThanOrEqual(2);
  });

  it('validates the create body against the controller-level schema, not just documents it', async () => {
    const server = app.getHttpServer();

    await request(server).post('/photo-body-fallback').send({}).expect(400);

    const validBody = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'test photo',
      description: 'a photo',
      filename: 'test.jpg',
      views: 0,
      isPublished: true,
      deletedAt: null,
    };
    await request(server)
      .post('/photo-body-fallback')
      .send(validBody)
      .expect(201);
  });
});

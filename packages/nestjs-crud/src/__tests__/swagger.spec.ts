import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { standardSchemaConverter } from '@concepta/nestjs-core';

import { CrudModule } from '../crud.module.js';
import { CrudController } from '../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudCreate } from '../infrastructure/decorators/operations/crud-create.decorator.js';

import { type OperationObject, type ParameterObject } from './openapi-types.js';

import { PhotoControllerFixture } from '../__fixtures__/photo/photo.controller.fixture.js';
import { photoCreateSchema } from '../__fixtures__/photo/schemas/photo-create.schema.fixture.js';
import { photoPaginatedSchema } from '../__fixtures__/photo/schemas/photo-paginated.schema.fixture.js';
import { photoSchema } from '../__fixtures__/photo/schemas/photo.schema.fixture.js';

const ARTIFACT_DIR = join(__dirname, '__artifacts__');

function getOp(
  doc: OpenAPIObject,
  path: string,
  method: string,
): OperationObject | undefined {
  const pathItem = doc.paths[path];
  if (!pathItem) return undefined;
  return (pathItem as Record<string, OperationObject | undefined>)[method];
}

function paramNames(
  doc: OpenAPIObject,
  path: string,
  method: string,
): string[] {
  return (getOp(doc, path, method)?.parameters ?? [])
    .filter((p): p is ParameterObject => !('$ref' in p))
    .map((p) => p.name);
}

describe('CrudModule swagger document', () => {
  let app: INestApplication;
  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [PhotoControllerFixture],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Crud Probe').setVersion('1.0').build(),
      { standardSchemaConverter },
    );

    mkdirSync(ARTIFACT_DIR, { recursive: true });
    writeFileSync(
      join(ARTIFACT_DIR, 'swagger.json'),
      JSON.stringify(doc, null, 2),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  // ── Paths ──────────────────────────────────────────────────────────────
  describe('paths', () => {
    it.each<[string, string, string]>([
      ['List', '/photo', 'get'],
      ['Create', '/photo', 'post'],
      ['CreateBatch', '/photo/bulk', 'post'],
      ['Read', '/photo/{id}', 'get'],
      ['Update', '/photo/{id}', 'patch'],
      ['Replace', '/photo/{id}', 'put'],
      ['Delete', '/photo/{id}', 'delete'],
      ['SoftDelete', '/photo/soft/{id}', 'delete'],
      ['Restore', '/photo/restore/{id}', 'patch'],
    ])('%s %s %s', (_op, path, method) => {
      expect(getOp(doc, path, method)).toBeDefined();
    });
  });

  // ── operationIds ───────────────────────────────────────────────────────
  describe('operationIds', () => {
    it.each<[string, string, string, string]>([
      ['list', '/photo', 'get', 'PhotoControllerFixture_list'],
      ['create', '/photo', 'post', 'PhotoControllerFixture_create'],
      [
        'createBatch',
        '/photo/bulk',
        'post',
        'PhotoControllerFixture_createBatch',
      ],
      ['read', '/photo/{id}', 'get', 'PhotoControllerFixture_read'],
      ['update', '/photo/{id}', 'patch', 'PhotoControllerFixture_update'],
      ['replace', '/photo/{id}', 'put', 'PhotoControllerFixture_replace'],
      ['delete', '/photo/{id}', 'delete', 'PhotoControllerFixture_delete'],
      [
        'softDelete',
        '/photo/soft/{id}',
        'delete',
        'PhotoControllerFixture_softDelete',
      ],
      [
        'restore',
        '/photo/restore/{id}',
        'patch',
        'PhotoControllerFixture_restore',
      ],
    ])('%s', (_method, path, httpMethod, expectedId) => {
      expect(getOp(doc, path, httpMethod)?.operationId).toBe(expectedId);
    });
  });

  // ── List query parameters ──────────────────────────────────────────────
  // Actual names come from CrudQueryBuilder.paramNamesMap:
  //   fields → 'select', search → 's', join → not in map (excluded)
  describe('List query parameters', () => {
    it.each([
      'select',
      's',
      'filter',
      'or',
      'sort',
      'limit',
      'offset',
      'page',
      'cache',
      'includeDeleted',
    ])('includes %s', (name) => {
      expect(paramNames(doc, '/photo', 'get')).toContain(name);
    });
  });

  // ── Read query parameters ──────────────────────────────────────────────
  describe('Read query parameters', () => {
    it.each(['select', 'cache', 'includeDeleted'])('includes %s', (name) => {
      expect(paramNames(doc, '/photo/{id}', 'get')).toContain(name);
    });
  });

  // ── Request bodies ─────────────────────────────────────────────────────
  // `crud-init-api-body.decorator.ts` routes request bodies through the
  // document-level `standardSchemaConverter`, same as responses — so a
  // schema registered via `withNamedComponent` documents as a `$ref` (see
  // `request bodies` in `petstore.spec.ts`). `photoCreateSchema`/
  // `photoUpdateSchema` (the method-level bodies these operations actually
  // use) are plain `withOpenApi`, not named components, so they still
  // inline — matching `cache`'s schema-based POST request body (see
  // `cache-crud.swagger.e2e-spec.ts`). These assert the inline object shape
  // (photoSchema's fields) rather than a "Photo" name/ref.
  describe('request bodies', () => {
    it.each<[string, string, string]>([
      ['Create', '/photo', 'post'],
      ['Update', '/photo/{id}', 'patch'],
      ['Replace', '/photo/{id}', 'put'],
    ])(
      '%s has an inline requestBody shaped like photoSchema',
      (_op, path, method) => {
        const rb = getOp(doc, path, method)?.requestBody;
        const rbJson = JSON.stringify(rb);
        expect(rbJson).toContain('"name"');
        expect(rbJson).toContain('"isPublished"');
        expect(rbJson).not.toContain('$ref');
      },
    );
  });

  // ── Response schemas ───────────────────────────────────────────────────
  describe('response schemas', () => {
    it('List 200 references PhotoPaginated', () => {
      const resp = getOp(doc, '/photo', 'get')?.responses?.['200'];
      expect(JSON.stringify(resp)).toContain('PhotoPaginated');
    });

    it('Read 200 references Photo', () => {
      const resp = getOp(doc, '/photo/{id}', 'get')?.responses?.['200'];
      expect(JSON.stringify(resp)).toContain('Photo');
    });
  });

  // ── Component schemas ──────────────────────────────────────────────────
  // Registered via the response schemas (photoSchema, photoPaginatedSchema)
  // — every write op here overrides the controller-level photoSchema body
  // with an unnamed method-level schema, so none of them contribute a body
  // component.
  describe('components.schemas', () => {
    it.each(['Photo', 'PhotoPaginated'])('registers %s', (name) => {
      expect(doc.components?.schemas?.[name]).toBeDefined();
    });
  });
});

// ── String-typed body regression ──────────────────────────────────────────
// When an operation has no local `request.body`, `CrudInitApiBody` resolves
// the controller-level default from the metadata hierarchy and documents
// that — not swagger's own `{ type: 'string' }` `ApiBody()` default, which
// only appears when no schema resolves anywhere at all (see
// `crud-init-api-body.decorator.ts`'s schemaless branch).
describe('CrudModule swagger request body resolution', () => {
  @CrudController({
    path: 'probe',
    entity: 'Probe',
    request: { body: photoCreateSchema },
    response: { resource: photoSchema, paginated: photoPaginatedSchema },
  })
  class ProbeControllerFixture {
    // deliberately NO local request.body — resolves the controller-level
    // schema via the metadata hierarchy instead
    @CrudCreate()
    async create() {
      return undefined;
    }
  }

  let app: INestApplication;
  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [ProbeControllerFixture],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Probe').setVersion('1.0').build(),
      { standardSchemaConverter },
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('documents the resolved schema, not the string placeholder', () => {
    const rb = getOp(doc, '/probe', 'post')?.requestBody;
    const rbJson = JSON.stringify(rb);
    // resolved photoCreateSchema shape is present
    expect(rbJson).toContain('"name"');
    expect(rbJson).toContain('"isPublished"');
    // the bare string placeholder is gone
    expect(rbJson).not.toContain('"schema":{"type":"string"}');
  });
});

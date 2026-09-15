import { z } from 'zod';

import { type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import {
  standardSchemaConverter,
  withNamedComponent,
  withOpenApi,
} from '@concepta/nestjs-core';

import { CrudModule } from '../crud.module.js';
import { CrudController } from '../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudInit } from '../infrastructure/decorators/controller/crud-init.decorator.js';
import { CrudCreate } from '../infrastructure/decorators/operations/crud-create.decorator.js';
import { CrudBody } from '../infrastructure/decorators/params/crud-body.decorator.js';

import { type OperationObject } from './openapi-types.js';

/**
 * Docs-only regression coverage for #467's mechanism — these all exercise
 * handwritten controllers (no TypeORM needed; `SwaggerModule.createDocument`
 * never invokes a route handler) via `crud-init-api-body.decorator.ts`'s
 * `ApiBody({ standardSchema })`. `request-body-hierarchy.e2e-spec.ts`
 * covers the fully-generated `ConfigurableCrudBuilder` + docs/validation
 * hierarchy convergence case (the reporter's actual config) separately.
 */

function requestBodySchema(doc: OpenAPIObject, path: string): unknown {
  const op = doc.paths[path]?.post as OperationObject | undefined;
  return (
    op?.requestBody as
      { content?: { 'application/json'?: { schema?: unknown } } } | undefined
  )?.content?.['application/json']?.schema;
}

describe('CrudBody({ schema }) beats a differing controller-level default (#467)', () => {
  const controllerLevelSchema = withNamedComponent(
    z.object({ fromController: z.string() }),
    'PrecedenceControllerSchema',
  );
  const paramLevelSchema = withNamedComponent(
    z.object({ fromParam: z.string() }),
    'PrecedenceParamSchema',
  );

  @CrudController({
    path: 'precedence-probe',
    entity: 'PrecedenceProbe',
    request: { body: controllerLevelSchema },
  })
  class PrecedenceProbeControllerFixture {
    @CrudCreate()
    async create(@CrudBody({ schema: paramLevelSchema }) dto: unknown) {
      return dto;
    }
  }

  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [PrecedenceProbeControllerFixture],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('precedence-probe')
        .setVersion('1.0')
        .build(),
      { standardSchemaConverter },
    );

    await app.close();
  });

  it("documents the parameter's own schema, not the controller-level default", () => {
    expect(requestBodySchema(doc, '/precedence-probe')).toEqual({
      $ref: '#/components/schemas/PrecedenceParamSchema',
    });
    expect(doc.components?.schemas?.PrecedenceControllerSchema).toBeUndefined();
  });
});

describe('nested named components in a request body (#467)', () => {
  const nestedNoteSchema = withNamedComponent(
    z.object({ note: z.string() }),
    'NestedNoteComponent',
  );
  const nestedBodySchema = withNamedComponent(
    z.object({ title: z.string(), note: nestedNoteSchema }),
    'NestedBodyComponent',
  );

  @CrudController({ path: 'nested-body-probe', entity: 'NestedBodyProbe' })
  class NestedBodyProbeControllerFixture {
    @CrudCreate()
    async create(@CrudBody({ schema: nestedBodySchema }) dto: unknown) {
      return dto;
    }
  }

  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [NestedBodyProbeControllerFixture],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('nested-body-probe')
        .setVersion('1.0')
        .build(),
      { standardSchemaConverter },
    );

    await app.close();
  });

  it('hoists the nested component and rewrites its $ref, with no dangling pointer', () => {
    expect(requestBodySchema(doc, '/nested-body-probe')).toEqual({
      $ref: '#/components/schemas/NestedBodyComponent',
    });
    expect(doc.components?.schemas?.NestedBodyComponent).toBeDefined();
    expect(doc.components?.schemas?.NestedNoteComponent).toBeDefined();

    const docJson = JSON.stringify(doc);
    expect(docJson).not.toContain('#/definitions/');
    expect(docJson).not.toContain('#/$defs/');
  });
});

describe('allowEmpty: false still documents a named body as a $ref (#467)', () => {
  const strictSchema = withNamedComponent(
    z.object({ name: z.string() }),
    'StrictBodyComponent',
  );

  @CrudController({ path: 'strict-body-probe', entity: 'StrictBodyProbe' })
  class StrictBodyProbeControllerFixture {
    @CrudCreate()
    async create(
      @CrudBody({ schema: strictSchema, validation: { allowEmpty: false } })
      dto: unknown,
    ) {
      return dto;
    }
  }

  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [StrictBodyProbeControllerFixture],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('strict-body-probe')
        .setVersion('1.0')
        .build(),
      { standardSchemaConverter },
    );

    await app.close();
  });

  it("does not degrade to inline (guards withEmptyBodyGuard's .refine() from reaching the docs schema)", () => {
    expect(requestBodySchema(doc, '/strict-body-probe')).toEqual({
      $ref: '#/components/schemas/StrictBodyComponent',
    });
  });
});

/**
 * `api.body` (`ApiBodyOptions` — description, examples, required) previously never survived
 * onto a schema-based request body: `CrudApiBody({...api?.body})` was only ever called when
 * the operation had NO local schema, and even then `crud-init-api-body.decorator.ts` stripped
 * that placeholder the moment a schema resolved from the metadata hierarchy. See the TODOs.md
 * "Per-operation api.body options silently dropped" item.
 */
describe('CrudApiBody carries ApiBodyOptions through to the resolved body (#api.body)', () => {
  describe('operation-level schema present', () => {
    const opSchema = withOpenApi(z.object({ fromOperation: z.string() }));

    @CrudController({ path: 'op-schema-probe', entity: 'OpSchemaProbe' })
    class OpSchemaProbeControllerFixture {
      @CrudCreate({
        request: { body: opSchema },
        api: {
          body: { description: 'Custom body description', required: false },
        },
      })
      async create(@CrudBody({ schema: opSchema }) dto: unknown) {
        return dto;
      }
    }

    let doc: OpenAPIObject;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CrudModule.forRoot({})],
        controllers: [OpSchemaProbeControllerFixture],
      }).compile();

      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('op-schema-probe')
          .setVersion('1.0')
          .build(),
        { standardSchemaConverter },
      );

      await app.close();
    });

    it('documents both the schema and the api.body overrides', () => {
      const rbJson = JSON.stringify(
        doc.paths['/op-schema-probe']?.post?.requestBody,
      );
      expect(rbJson).toContain('"fromOperation"');
      expect(rbJson).toContain('Custom body description');
      expect(rbJson).toContain('"required":false');
    });
  });

  describe('controller-level default schema, no operation-level schema', () => {
    const controllerSchema = withOpenApi(
      z.object({ fromController: z.string() }),
    );

    @CrudController({
      path: 'controller-schema-probe',
      entity: 'ControllerSchemaProbe',
      request: { body: controllerSchema },
    })
    class ControllerSchemaProbeControllerFixture {
      @CrudCreate({
        api: { body: { description: 'Inherited body description' } },
      })
      async create(@CrudBody({ schema: controllerSchema }) dto: unknown) {
        return dto;
      }
    }

    let doc: OpenAPIObject;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CrudModule.forRoot({})],
        controllers: [ControllerSchemaProbeControllerFixture],
      }).compile();

      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('controller-schema-probe')
          .setVersion('1.0')
          .build(),
        { standardSchemaConverter },
      );

      await app.close();
    });

    it('documents both the inherited schema and the api.body override', () => {
      const rbJson = JSON.stringify(
        doc.paths['/controller-schema-probe']?.post?.requestBody,
      );
      expect(rbJson).toContain('"fromController"');
      expect(rbJson).toContain('Inherited body description');
    });
  });

  describe('no schema anywhere', () => {
    @CrudController({ path: 'schemaless-probe', entity: 'SchemalessProbe' })
    class SchemalessProbeControllerFixture {
      @CrudCreate({ api: { body: { description: 'Schemaless body' } } })
      async create() {
        return undefined;
      }
    }

    let doc: OpenAPIObject;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CrudModule.forRoot({})],
        controllers: [SchemalessProbeControllerFixture],
      }).compile();

      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('schemaless-probe')
          .setVersion('1.0')
          .build(),
        { standardSchemaConverter },
      );

      await app.close();
    });

    it('documents the api.body description alongside the default string body shape', () => {
      const rbJson = JSON.stringify(
        doc.paths['/schemaless-probe']?.post?.requestBody,
      );
      expect(rbJson).toContain('Schemaless body');
      expect(rbJson).toContain('"schema":{"type":"string"}');
    });
  });

  describe('re-running CrudInit() overrides a stale body entry instead of duplicating it', () => {
    // Mirrors what configurable-crud.builder.ts's hybrid path does at :708 — @CrudController
    // already ran CrudInit() once at decoration time; pinning a different schema via CrudBody
    // and re-running CrudInit() must make the SECOND schema win, not silently keep the first
    // (ApiBody's own metadata storage is append-only and Swagger's dedup is first-wins, so
    // this only works if crud-init-api-body.decorator.ts's own entries stay idempotent).
    const controllerSchema = withOpenApi(
      z.object({ fromController: z.string() }),
    );
    const overrideSchema = withOpenApi(z.object({ fromOverride: z.string() }));

    @CrudController({
      path: 'idempotent-probe',
      entity: 'IdempotentProbe',
      request: { body: controllerSchema },
    })
    class IdempotentProbeControllerFixture {
      // No explicit @CrudBody here — mirrors crud.module.forfeature.spec.ts's
      // CompanyControllerD, which relies on hierarchy fallback for the first
      // CrudInit() run (from @CrudController), then gets a real @CrudBody
      // applied exactly once by the hybrid builder for the second run.
      @CrudCreate()
      async create(dto: unknown) {
        return dto;
      }
    }

    CrudBody({ schema: overrideSchema })(
      IdempotentProbeControllerFixture.prototype,
      'create',
      1,
    );
    CrudInit()(IdempotentProbeControllerFixture);

    let doc: OpenAPIObject;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CrudModule.forRoot({})],
        controllers: [IdempotentProbeControllerFixture],
      }).compile();

      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();

      doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('idempotent-probe')
          .setVersion('1.0')
          .build(),
        { standardSchemaConverter },
      );

      await app.close();
    });

    it('documents the second (overriding) schema, not the first', () => {
      const rbJson = JSON.stringify(
        doc.paths['/idempotent-probe']?.post?.requestBody,
      );
      expect(rbJson).toContain('"fromOverride"');
      expect(rbJson).not.toContain('"fromController"');
    });
  });
});

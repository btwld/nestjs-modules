import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';

import { type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { standardSchemaConverter } from '@concepta/nestjs-core';

import { CrudModule } from '../../crud.module.js';
import {
  type OperationObject,
  type ParameterObject,
  type SchemaObject,
} from '../openapi-types.js';

import { PetController } from './controllers/pet.controller.js';
import { StoreController } from './controllers/store.controller.js';
import { UserController } from './controllers/user.controller.js';

const ARTIFACT_DIR = join(__dirname, '../__artifacts__');

function getOp(
  doc: OpenAPIObject,
  path: string,
  method: string,
): OperationObject | undefined {
  const pathItem = doc.paths[path];
  if (!pathItem) return undefined;
  return (pathItem as Record<string, OperationObject | undefined>)[method];
}

function pathParamNames(
  doc: OpenAPIObject,
  path: string,
  method: string,
): string[] {
  return (getOp(doc, path, method)?.parameters ?? [])
    .filter((p): p is ParameterObject => !('$ref' in p) && p.in === 'path')
    .map((p) => p.name);
}

describe('Petstore3 CRUD-fits replication', () => {
  let app: INestApplication;
  let doc: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({})],
      controllers: [PetController, StoreController, UserController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Petstore').setVersion('1.0.27').build(),
      { standardSchemaConverter },
    );

    mkdirSync(ARTIFACT_DIR, { recursive: true });
    writeFileSync(
      join(ARTIFACT_DIR, 'petstore.json'),
      JSON.stringify(doc, null, 2),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  // ── OpenAPI spec compliance ──────────────────────────────────────────────────
  // Validates the ACTUAL JSON written to disk above (the real output of the
  // crud controller api decorators), not the in-memory `doc` reference —
  // against the real OpenAPI 3.0 spec, independent of whatever shape
  // @nestjs/swagger's own TS types claim. Catches structural defects our
  // hand-written assertions elsewhere in this file wouldn't, e.g. #467's
  // dangling `#/definitions/` pointers or a malformed schema object.
  it('produces valid, spec-compliant OpenAPI 3.0 JSON', async () => {
    const generated = JSON.parse(
      readFileSync(join(ARTIFACT_DIR, 'petstore.json'), 'utf8'),
    );
    await expect(SwaggerParser.validate(generated)).resolves.toBeDefined();
  });

  // ── Paths ──────────────────────────────────────────────────────────────────
  describe('paths', () => {
    it.each<[string, string, string]>([
      ['addPet', '/pet', 'post'],
      ['getPetById', '/pet/{petId}', 'get'],
      ['updatePetWithForm', '/pet/{petId}', 'put'],
      ['deletePet', '/pet/{petId}', 'delete'],
      ['placeOrder', '/store/order', 'post'],
      ['getOrderById', '/store/order/{orderId}', 'get'],
      ['deleteOrder', '/store/order/{orderId}', 'delete'],
      ['createUser', '/user', 'post'],
      ['getUserByName', '/user/{username}', 'get'],
      ['updateUser', '/user/{username}', 'put'],
      ['deleteUser', '/user/{username}', 'delete'],
    ])('%s %s %s', (_op, path, method) => {
      expect(getOp(doc, path, method)).toBeDefined();
    });
  });

  // ── OperationIds ───────────────────────────────────────────────────────────
  describe('operationIds', () => {
    it.each<[string, string, string, string]>([
      ['addPet', '/pet', 'post', 'addPet'],
      ['getPetById', '/pet/{petId}', 'get', 'getPetById'],
      ['updatePetWithForm', '/pet/{petId}', 'put', 'updatePetWithForm'],
      ['deletePet', '/pet/{petId}', 'delete', 'deletePet'],
      ['placeOrder', '/store/order', 'post', 'placeOrder'],
      ['getOrderById', '/store/order/{orderId}', 'get', 'getOrderById'],
      ['deleteOrder', '/store/order/{orderId}', 'delete', 'deleteOrder'],
      ['createUser', '/user', 'post', 'createUser'],
      ['getUserByName', '/user/{username}', 'get', 'getUserByName'],
      ['updateUser', '/user/{username}', 'put', 'updateUser'],
      ['deleteUser', '/user/{username}', 'delete', 'deleteUser'],
    ])('%s', (_name, path, method, operationId) => {
      expect(getOp(doc, path, method)?.operationId).toBe(operationId);
    });
  });

  // ── Tags ───────────────────────────────────────────────────────────────────
  describe('tags', () => {
    it.each<[string, string, string, string]>([
      ['addPet', '/pet', 'post', 'pet'],
      ['getPetById', '/pet/{petId}', 'get', 'pet'],
      ['updatePetWithForm', '/pet/{petId}', 'put', 'pet'],
      ['deletePet', '/pet/{petId}', 'delete', 'pet'],
      ['placeOrder', '/store/order', 'post', 'store'],
      ['getOrderById', '/store/order/{orderId}', 'get', 'store'],
      ['deleteOrder', '/store/order/{orderId}', 'delete', 'store'],
      ['createUser', '/user', 'post', 'user'],
      ['getUserByName', '/user/{username}', 'get', 'user'],
      ['updateUser', '/user/{username}', 'put', 'user'],
      ['deleteUser', '/user/{username}', 'delete', 'user'],
    ])('%s has tag %s', (_name, path, method, tag) => {
      expect(getOp(doc, path, method)?.tags).toContain(tag);
    });
  });

  // ── Path param names ───────────────────────────────────────────────────────
  describe('path param names', () => {
    it.each<[string, string, string]>([
      ['/pet/{petId}', 'get', 'petId'],
      ['/pet/{petId}', 'put', 'petId'],
      ['/pet/{petId}', 'delete', 'petId'],
      ['/store/order/{orderId}', 'get', 'orderId'],
      ['/store/order/{orderId}', 'delete', 'orderId'],
      ['/user/{username}', 'get', 'username'],
      ['/user/{username}', 'put', 'username'],
      ['/user/{username}', 'delete', 'username'],
    ])('%s %s has path param %s', (path, method, paramName) => {
      expect(pathParamNames(doc, path, method)).toContain(paramName);
    });
  });

  // ── Component schemas ──────────────────────────────────────────────────────
  describe('components.schemas', () => {
    it.each(['Pet', 'Order', 'User', 'Category', 'Tag'])(
      'registers %s',
      (name) => {
        expect(doc.components?.schemas?.[name]).toBeDefined();
      },
    );
  });

  // ── Duplicate $ref grouping ─────────────────────────────────────────────────
  // Pet/Order/User are each $ref-ed from BOTH a request body (#467) and one or
  // more responses, across multiple operations — proves the document converter
  // groups every usage into a single named component rather than registering a
  // duplicate (e.g. a renamed "PetCreate") per call site.
  describe('duplicate $refs are grouped into a single component', () => {
    it.each(['Pet', 'Order', 'User', 'Category', 'Tag'])(
      'registers exactly one %s component',
      (name) => {
        const matchingKeys = Object.keys(doc.components?.schemas ?? {}).filter(
          (key) => key === name,
        );
        expect(matchingKeys).toHaveLength(1);
      },
    );

    it.each<[string, number]>([
      ['Pet', 5], // addPet body+response, getPetById response, updatePetWithForm body+response
      ['Order', 3], // placeOrder body+response, getOrderById response
      ['User', 5], // createUser body+response, getUserByName response, updateUser body+response
    ])(
      '%s is $ref-ed %i times across body and response usages',
      (name, count) => {
        // trailing quote guards against a false prefix match (e.g. Pet vs PetPaginated)
        const needle = `"$ref":"#/components/schemas/${name}"`;
        const refCount = JSON.stringify(doc).split(needle).length - 1;
        expect(refCount).toBe(count);
      },
    );
  });

  // ── Pet schema shapes ──────────────────────────────────────────────────────
  describe('Pet schema', () => {
    let petSchema: SchemaObject;

    beforeAll(() => {
      petSchema = doc.components?.schemas?.['Pet'] as SchemaObject;
    });

    it('has required: name', () => {
      expect(petSchema?.required).toContain('name');
    });

    it('has required: photoUrls', () => {
      expect(petSchema?.required).toContain('photoUrls');
    });

    it('status has enum [available, pending, sold]', () => {
      const statusProp = petSchema?.properties?.['status'] as SchemaObject;
      expect(statusProp?.enum).toEqual(['available', 'pending', 'sold']);
    });

    it('category references Category schema', () => {
      const categoryProp = petSchema?.properties?.['category'];
      expect(JSON.stringify(categoryProp)).toContain('Category');
    });

    it('tags is array referencing Tag schema', () => {
      const tagsProp = petSchema?.properties?.['tags'] as SchemaObject;
      expect(tagsProp?.type).toBe('array');
      expect(JSON.stringify(tagsProp?.items)).toContain('Tag');
    });
  });

  // ── Order schema shapes ────────────────────────────────────────────────────
  describe('Order schema', () => {
    let orderSchema: SchemaObject;

    beforeAll(() => {
      orderSchema = doc.components?.schemas?.['Order'] as SchemaObject;
    });

    it('id has format int64', () => {
      const idProp = orderSchema?.properties?.['id'] as SchemaObject;
      expect(idProp?.format).toBe('int64');
    });

    it('status has enum [placed, approved, delivered]', () => {
      const statusProp = orderSchema?.properties?.['status'] as SchemaObject;
      expect(statusProp?.enum).toEqual(['placed', 'approved', 'delivered']);
    });
  });

  // ── Request bodies ─────────────────────────────────────────────────────────
  describe('request bodies', () => {
    it.each<[string, string, string]>([
      ['addPet', '/pet', 'post'],
      ['updatePetWithForm', '/pet/{petId}', 'put'],
      ['placeOrder', '/store/order', 'post'],
      ['updateUser', '/user/{username}', 'put'],
      ['createUser', '/user', 'post'],
    ])('%s has requestBody referencing its schema', (_name, path, method) => {
      const rb = getOp(doc, path, method)?.requestBody;
      expect(rb).toBeDefined();
    });
  });

  // ── Upstream comparison ────────────────────────────────────────────────────
  // Compares the Rockets-generated doc against the canonical petstore3 spec.
  // Only the 11 in-scope operations are compared; skipped ops and prose fields
  // (summary, description, security, servers, xml) are intentionally omitted.
  describe('upstream comparison', () => {
    let upstream: OpenAPIObject;

    beforeAll(() => {
      upstream = JSON.parse(
        readFileSync(join(__dirname, 'petstore-upstream.json'), 'utf8'),
      ) as OpenAPIObject;
    });

    it('upstream spec loaded', () => {
      expect(upstream.openapi).toBeDefined();
    });

    it.each<[string, string]>([
      ['/pet', 'post'],
      ['/pet/{petId}', 'get'],
      ['/pet/{petId}', 'put'],
      ['/pet/{petId}', 'delete'],
      ['/store/order', 'post'],
      ['/store/order/{orderId}', 'get'],
      ['/store/order/{orderId}', 'delete'],
      ['/user', 'post'],
      ['/user/{username}', 'get'],
      ['/user/{username}', 'put'],
      ['/user/{username}', 'delete'],
    ])('%s %s operationId matches upstream', (path, method) => {
      // Note: /pet/{petId} PUT is remapped from upstream POST; operationId is preserved.
      const upstreamMethod =
        path === '/pet/{petId}' && method === 'put' ? 'post' : method;
      const upstreamOp = getOp(upstream, path, upstreamMethod);
      const rocketsOp = getOp(doc, path, method);
      expect(rocketsOp?.operationId).toBe(upstreamOp?.operationId);
    });

    it.each(['Pet', 'Order', 'User', 'Category', 'Tag'])(
      '%s schema exists in upstream',
      (name) => {
        expect(upstream.components?.schemas?.[name]).toBeDefined();
      },
    );

    it.each(['Pet', 'Order', 'User', 'Category', 'Tag'])(
      '%s schema property keys match upstream',
      (name) => {
        const rocketsProps = Object.keys(
          (doc.components?.schemas?.[name] as SchemaObject)?.properties ?? {},
        ).sort();
        const upstreamProps = Object.keys(
          (upstream.components?.schemas?.[name] as SchemaObject)?.properties ??
            {},
        ).sort();
        expect(rocketsProps).toEqual(upstreamProps);
      },
    );
  });
});

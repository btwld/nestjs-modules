import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';

import { SeedingSource } from '@concepta/typeorm-seeding';

import { AppCcbCustomModuleFixture } from '../__fixtures__/app-ccb-custom.module.fixture.js';
import { AppCcbSubModuleFixture } from '../__fixtures__/app-ccb-sub.module.fixture.js';
import { AppCcbModuleFixture } from '../__fixtures__/app-ccb.module.fixture.js';
import { AppResolverCqrsModuleFixture } from '../__fixtures__/app-resolver-cqrs.module.fixture.js';
import { AppResolverOperationModuleFixture } from '../__fixtures__/app-resolver-operation.module.fixture.js';
import { AppModuleFixture } from '../__fixtures__/app.module.fixture.js';
import { default as ormConfig } from '../__fixtures__/ormconfig.fixture.js';
import { type PhotoFixture } from '../__fixtures__/photo/photo.entity.fixture.js';
import { PhotoFactoryFixture } from '../__fixtures__/photo/photo.factory.fixture.js';
import { PhotoSeederFixture } from '../__fixtures__/photo/photo.seeder.fixture.js';

// Picks exactly the fields `photoSchema` exposes — the schema-based
// replacement for the legacy `plainToInstance(PhotoDtoFixture, photo, {
// excludeExtraneousValues: true })` + `instanceToPlain(...)` round trip.
const toPhotoBody = (photo: PhotoFixture) => ({
  id: photo.id,
  name: photo.name,
  description: photo.description,
  filename: photo.filename,
  views: photo.views,
  isPublished: photo.isPublished,
  deletedAt: photo.deletedAt,
});

/**
 * Consolidated CRUD Operations E2E Test
 *
 * Tests all 9 CRUD operations against all fixture variations:
 * - List, Read, Create, CreateBatch, Update, Replace, Delete, SoftDelete, Restore
 *
 * Fixture variations:
 * 1. AppModuleFixture - forFeature pattern with manual controller
 * 2. AppCcbModuleFixture - ConfigurableCrudBuilder generated controller
 * 3. AppCcbCustomModuleFixture - ConfigurableCrudBuilder pre-decorated controller
 * 4. AppCcbSubModuleFixture - ConfigurableCrudBuilder subclass controller
 * 5. AppResolverOperationModuleFixture - CrudOperationResolver
 * 6. AppResolverCqrsModuleFixture - CrudCqrsResolver
 */
describe.each([
  { name: 'forFeature', testModule: AppModuleFixture },
  { name: 'CCB Generated', testModule: AppCcbModuleFixture },
  { name: 'CCB Pre-decorated', testModule: AppCcbCustomModuleFixture },
  { name: 'CCB Subclass', testModule: AppCcbSubModuleFixture },
  { name: 'Operation Resolver', testModule: AppResolverOperationModuleFixture },
  { name: 'CQRS Resolver', testModule: AppResolverCqrsModuleFixture },
])('CRUD Operations ($name)', ({ testModule }) => {
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let photoFactory: PhotoFactoryFixture;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(ormConfig), testModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const dataSource = app.get(getDataSourceToken());
    seedingSource = new SeedingSource({ dataSource });
    await seedingSource.initialize();
    photoFactory = new PhotoFactoryFixture({ seedingSource });
    await seedingSource.run.one(PhotoSeederFixture);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  const expectedPhotoShape = {
    id: expect.any(String),
    name: expect.any(String),
    description: expect.any(String),
    filename: expect.any(String),
    views: expect.any(Number),
    isPublished: expect.any(Boolean),
    deletedAt: null,
  };

  describe('List', () => {
    it('GET /photo?limit=10', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/photo?limit=10')
        .expect(200);

      const { data, ...envelope } = response.body;
      expect(envelope).toEqual({
        count: 10,
        total: 15,
        page: 1,
        pageCount: 2,
        limit: 10,
      });
      expect(data).toHaveLength(10);
      data.forEach((item: Record<string, unknown>) => {
        expect(item).toEqual(expectedPhotoShape);
      });
    });

    it('GET /photo?limit=10&page=1', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/photo?limit=10&page=1')
        .expect(200);

      const { data, ...envelope } = response.body;
      expect(envelope).toEqual({
        count: 10,
        total: 15,
        page: 1,
        pageCount: 2,
        limit: 10,
      });
      expect(data).toHaveLength(10);
      data.forEach((item: Record<string, unknown>) => {
        expect(item).toEqual(expectedPhotoShape);
      });
    });
  });

  describe('Read', () => {
    it('GET /photo/:id', async () => {
      const photo = await photoFactory.create();

      const response = await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(200);

      expect(response.body).toEqual(toPhotoBody(photo));
    });

    it('GET /photo/:id returns 404 for non-existent', async () => {
      await supertest(app.getHttpServer())
        .get('/photo/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('Create', () => {
    it('POST /photo', async () => {
      const photo = await photoFactory.make();
      const { id: _id, deletedAt: _del, ...createBody } = toPhotoBody(photo);

      const response = await supertest(app.getHttpServer())
        .post('/photo')
        .send(createBody)
        .expect(201);

      expect(response.body).toEqual({
        ...createBody,
        id: expect.any(String),
        deletedAt: null,
      });
    });
  });

  describe('CreateBatch', () => {
    it('POST /photo/bulk', async () => {
      const photos = await photoFactory.createMany(5);

      const response = await supertest(app.getHttpServer())
        .post('/photo/bulk')
        .send({ bulk: photos })
        .expect(201);

      expect(response.body).toEqual(
        photos.map((photo) => ({
          ...toPhotoBody(photo),
          id: expect.any(String),
        })),
      );
    });
  });

  describe('Update', () => {
    it('PATCH /photo/:id', async () => {
      const photo = await photoFactory.create();
      photo.views = 37;

      const expected = toPhotoBody(photo);
      const { id, deletedAt: _del, ...updateBody } = expected;

      const response = await supertest(app.getHttpServer())
        .patch(`/photo/${id}`)
        .send(updateBody)
        .expect(200);

      expect(response.body).toEqual(expected);
    });
  });

  describe('Replace', () => {
    it('PUT /photo/:id', async () => {
      const photo = await photoFactory.create();
      const expected = toPhotoBody(photo);
      const { id, deletedAt: _del, ...replaceBody } = expected;

      const response = await supertest(app.getHttpServer())
        .put(`/photo/${id}`)
        .send(replaceBody)
        .expect(200);

      expect(response.body).toEqual(expected);
    });
  });

  describe('Delete (hard)', () => {
    it('DELETE /photo/:id', async () => {
      const photo = await photoFactory.create();

      await supertest(app.getHttpServer())
        .delete(`/photo/${photo.id}`)
        .expect(204)
        .expect('');

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);
    });
  });

  describe('SoftDelete', () => {
    it('DELETE /photo/soft/:id', async () => {
      const photo = await photoFactory.create();

      await supertest(app.getHttpServer())
        .delete(`/photo/soft/${photo.id}`)
        .expect(204)
        .expect('');

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);
    });
  });

  describe('Restore', () => {
    it('PATCH /photo/restore/:id after soft delete', async () => {
      const photo = await photoFactory.create();
      const expected = toPhotoBody(photo);

      // Soft delete
      await supertest(app.getHttpServer())
        .delete(`/photo/soft/${photo.id}`)
        .expect(204);

      // Verify not found
      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);

      // Restore (returnRestored defaults to false)
      await supertest(app.getHttpServer())
        .patch(`/photo/restore/${photo.id}`)
        .expect(204)
        .expect('');

      // Verify found again
      const readResponse = await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(200);

      expect(readResponse.body).toEqual(expected);
    });
  });
});

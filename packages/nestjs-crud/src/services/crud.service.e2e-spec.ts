import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SeedingSource } from '@concepta/typeorm-seeding';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { PhotoFixture } from '../__fixtures__/photo/photo.entity.fixture';
import { PhotoFactoryFixture } from '../__fixtures__/photo/photo.factory.fixture';
import { PhotoSeederFixture } from '../__fixtures__/photo/photo.seeder.fixture';

describe('AppController (e2e)', () => {
  describe('Authentication', () => {
    let app: INestApplication;
    let seedingSource: SeedingSource;

    let photoFactory: PhotoFactoryFixture;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModuleFixture],
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
      jest.clearAllMocks();
      return app ? await app.close() : undefined;
    });

    it('GET /photo?limit=10', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/photo?limit=10')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toEqual(10);

      expect(response.body).toBeInstanceOf(Object);
    });

    it('GET /photo?limit=10&page=1', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/photo?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeInstanceOf(Object);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toEqual(10);
      expect(response.body.page).toEqual(1);
      expect(response.body.pageCount).toEqual(2);
      expect(response.body.count).toEqual(10);
      expect(response.body.total).toEqual(15);
      expect(typeof response.body.data[0].id).toEqual('string');
    });

    it('GET /photo/:id', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);

      const response = await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Object);
    });

    it('POST /photo', async () => {
      const photo = await photoFactory.make();

      const newPhoto: Partial<Pick<PhotoFixture, 'id'>> &
        Omit<PhotoFixture, 'id'> = photo;

      delete newPhoto.id;

      const response = await supertest(app.getHttpServer())
        .post('/photo')
        .send(newPhoto)
        .expect(201);

      expect(response.body).toBeInstanceOf(Object);
      expect(typeof response.body.id).toEqual('string');
    });

    it('POST /photo/bulk', async () => {
      const photos = await photoFactory.createMany(5);

      const response = await supertest(app.getHttpServer())
        .post('/photo/bulk')
        .send({
          bulk: photos,
        })
        .expect(201);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toEqual(5);
    });

    it('PATCH /photo/:id', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);
      photo.views = 37;

      const { id, ...rest } = { ...photo };

      const response = await supertest(app.getHttpServer())
        .patch(`/photo/${id}`)
        .send(rest)
        .expect(200);

      expect(response.body).toMatchObject(photo);
      expect(response.body.views).toEqual(37);
    });

    it('PUT /photo/:id', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);

      const { id, ...rest } = { ...photo };

      const response = await supertest(app.getHttpServer())
        .put(`/photo/${id}`)
        .send(rest)
        .expect(200);

      expect(response.body).toMatchObject(photo);
    });

    it('DELETE /photo/1', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);

      await supertest(app.getHttpServer())
        .delete(`/photo/${photo.id}`)
        .expect(200);

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);
    });

    it('DELETE /photo/soft/1', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);

      await supertest(app.getHttpServer())
        .delete(`/photo/soft/${photo.id}`)
        .expect(200);

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);
    });

    it('PATCH /photo/recover/1', async () => {
      const photo = await photoFactory.create();
      expect(photo).toBeInstanceOf(PhotoFixture);

      await supertest(app.getHttpServer())
        .delete(`/photo/soft/${photo.id}`)
        .expect(200);

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(404);

      await supertest(app.getHttpServer())
        .patch(`/photo/recover/${photo.id}`)
        .expect(200);

      await supertest(app.getHttpServer())
        .get(`/photo/${photo.id}`)
        .expect(200);
    });
  });
});

import assert from 'assert';
import { randomUUID } from 'crypto';

import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { CacheCreatableInterface } from '@concepta/nestjs-common';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { CacheFactory } from '../cache.factory';
import { CacheSeeder } from '../cache.seeder';

import { AppCrudModuleFixture } from '../__fixtures__/app-crud.module.fixture';
import { UserCacheEntityFixture } from '../__fixtures__/entities/user-cache-entity.fixture';
import { UserEntityFixture } from '../__fixtures__/entities/user-entity.fixture';
import { UserCacheFactoryFixture } from '../__fixtures__/factories/user-cache.factory.fixture';
import { UserFactoryFixture } from '../__fixtures__/factories/user.factory.fixture';

describe('CacheAssignmentController (e2e)', () => {
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let userFactory: UserFactoryFixture;
  let userCacheFactory: UserCacheFactoryFixture;
  let user: UserEntityFixture;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppCrudModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    userFactory = new UserFactoryFixture({ seedingSource });
    userCacheFactory = new UserCacheFactoryFixture({ seedingSource });

    const cacheSeeder = new CacheSeeder({
      factories: [new CacheFactory({ entity: UserCacheEntityFixture })],
    });

    await seedingSource.run.one(cacheSeeder);

    user = await userFactory.create();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  it('GET /cache/user', async () => {
    await userCacheFactory
      .map((userCache) => {
        userCache.assigneeId = user.id;
      })
      .createMany(2);

    await supertest(app.getHttpServer())
      .get('/cache/user?limit=2')
      .expect(200)
      .then((res) => {
        assert.strictEqual(res.body.length, 2);
      });
  });

  it('GET /cache/user/:id', async () => {
    const userCache = await userCacheFactory
      .map((userCache) => {
        userCache.assigneeId = user.id;
      })
      .create();

    await supertest(app.getHttpServer())
      .get(
        `/cache/user/${userCache.id}` + `?filter[0]=key||$eq||${userCache.key}`,
      )
      .expect(200)
      .then((res) => {
        assert.strictEqual(res.body.assigneeId, user.id);
      });
  });

  it('GET /cache/user/ with key and type filters', async () => {
    const userCache = await userCacheFactory
      .map((userCache) => {
        userCache.assigneeId = user.id;
        userCache.key = 'specific-key';
        userCache.type = 'specific-type';
        userCache.data = JSON.stringify({ name: 'John Doe' });
      })
      .create();

    const url =
      `/cache/user/` +
      `?filter[0]=key||$eq||${userCache.key}` +
      `&filter[1]=type||$eq||${userCache.type}`;
    // Assuming your endpoint can filter by key and type
    await supertest(app.getHttpServer())
      .get(url)
      .expect(200)
      .then((res) => {
        const response = res.body[0];
        assert.strictEqual(response.assigneeId, user.id);
        assert.strictEqual(response.key, userCache.key);
        assert.strictEqual(response.type, userCache.type);
        assert.strictEqual(response.data, userCache.data);
      });
  });

  it('POST /cache/user creating user with success', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(201)
      .then((res) => {
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });
  });

  it('POST /cache/user assignee id null', async () => {
    const payload = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assignee: { id: null },
    };

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(400);
  });

  it('POST /cache/user Duplicated', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(201)
      .then((res) => {
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });
  });

  it('POST /cache/user null after create', async () => {
    interface ExtendedCacheCreatableInterface
      extends Pick<
        CacheCreatableInterface,
        'key' | 'expiresIn' | 'type' | 'data'
      > {
      assigneeId: string | null;
    }
    const payload: ExtendedCacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(201)
      .then((res) => {
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });

    payload.data = '{ "name": "John Doe" }';
    payload.expiresIn = null;
    payload.assigneeId = null;

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(400);

    payload.assigneeId = '';
    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(400);

    payload.assigneeId = null;
    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(400);
  });

  it('PATCH /cache/user Update', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    let cacheId = '';

    await supertest(app.getHttpServer())
      .post('/cache/user')
      .send(payload)
      .expect(201)
      .then((res) => {
        cacheId = res.body.id;
        expect(typeof res.body.id).toEqual('string');
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });

    payload.data = '{ "name": "John Doe" }';
    payload.expiresIn = null;

    await supertest(app.getHttpServer())
      .patch(`/cache/user/${cacheId}`)
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body.key).toBe(payload.key);
        expect(res.body.data).toBe(payload.data);
        expect(res.body.assigneeId).toBe(user.id);
      });

    const url =
      `/cache/user/` +
      `?filter[0]=key||$eq||${payload.key}` +
      `&filter[1]=type||$eq||${payload.type}` +
      `&filter[2]=assigneeId||$eq||${payload.assigneeId}`;

    // Assuming your endpoint can filter by key and type
    await supertest(app.getHttpServer())
      .get(url)
      .expect(200)
      .then((res) => {
        const response = res.body[0];
        assert.strictEqual(response.assigneeId, user.id);
        assert.strictEqual(response.key, payload.key);
        assert.strictEqual(response.type, payload.type);
        assert.strictEqual(response.data, payload.data);
      });
  });

  it.skip('PUT /cache/user', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    const cacheId = randomUUID();

    await supertest(app.getHttpServer())
      .put(`/cache/user/${cacheId}`)
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(cacheId);
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });

    payload.data = '{ "name": "John Doe" }';
    payload.expiresIn = null;

    await supertest(app.getHttpServer())
      .put(`/cache/user/${cacheId}`)
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body.key).toBe(payload.key);
        expect(res.body.data).toBe(payload.data);
        expect(res.body.assigneeId).toBe(user.id);
      });

    const url =
      `/cache/user/` +
      `?filter[0]=key||$eq||${payload.key}` +
      `&filter[1]=type||$eq||${payload.type}` +
      `&filter[2]=assigneeId||$eq||${payload.assigneeId}`;

    // Assuming your endpoint can filter by key and type
    await supertest(app.getHttpServer())
      .get(url)
      .expect(200)
      .then((res) => {
        const response = res.body[0];
        assert.strictEqual(response.assigneeId, user.id);
        assert.strictEqual(response.key, payload.key);
        assert.strictEqual(response.type, payload.type);
        assert.strictEqual(response.data, payload.data);
      });
  });

  it('DELETE /cache/user/:id', async () => {
    const userCache = await userCacheFactory
      .map((userCache) => {
        userCache.assigneeId = user.id;
      })
      .create();

    await supertest(app.getHttpServer())
      .delete(`/cache/user/${userCache.id}`)
      .expect(200);
  });
});

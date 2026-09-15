import assert from 'assert';
import { randomUUID } from 'crypto';

import supertest from 'supertest';
import { type MockInstance } from 'vitest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { TransactionScope } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { CacheSeederFixture } from '../../../__tests__/fixtures/cache.seeder.fixture.js';
import { UserCacheEntityFixture } from '../../../__tests__/fixtures/entities/user-cache-entity.fixture.js';
import { type UserEntityFixture } from '../../../__tests__/fixtures/entities/user-entity.fixture.js';
import { UserCacheFactoryFixture } from '../../../__tests__/fixtures/factories/user-cache.factory.fixture.js';
import { UserFactoryFixture } from '../../../__tests__/fixtures/factories/user.factory.fixture.js';
import { type CacheCreatableInterface } from '../../../domain/interfaces/cache-creatable.interface.js';
import { CacheFactory } from '../../../infrastructure/seeding/cache.factory.js';

import { AppCrudModuleFixture } from './fixtures/app-crud.module.fixture.js';

describe('CacheAssignmentController (e2e)', () => {
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let userFactory: UserFactoryFixture;
  let userCacheFactory: UserCacheFactoryFixture;
  let user: UserEntityFixture;
  let txSpy: MockInstance;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppCrudModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const txScope = app.get(TransactionScope);
    txSpy = vi.spyOn(txScope, 'run');

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    userFactory = new UserFactoryFixture({ seedingSource });
    userCacheFactory = new UserCacheFactoryFixture({ seedingSource });

    const cacheSeeder = new CacheSeederFixture({
      factories: [new CacheFactory({ entity: UserCacheEntityFixture })],
    });

    await seedingSource.run.one(cacheSeeder);

    user = await userFactory.create();
  });

  afterEach(async () => {
    vi.clearAllMocks();
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
        assert.strictEqual(res.body.data.length, 2);
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
        const response = res.body.data[0];
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
    interface ExtendedCacheCreatableInterface extends Pick<
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
      `/cache/user` +
      `?filter[0]=key||$eq||${payload.key}` +
      `&filter[1]=type||$eq||${payload.type}` +
      `&filter[2]=assigneeId||$eq||${payload.assigneeId}`;

    await supertest(app.getHttpServer())
      .get(url)
      .expect(200)
      .then((res) => {
        const response = res.body.data[0];
        assert.strictEqual(response.assigneeId, user.id);
        assert.strictEqual(response.key, payload.key);
        assert.strictEqual(response.type, payload.type);
        assert.strictEqual(response.data, payload.data);
      });
  });

  it('PATCH /cache/user extending TTL without resending data leaves data unchanged', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{"original":true}',
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
      });

    // PATCH with only `expiresIn` — `data` and `key`/`type`/`assigneeId`
    // are all omitted, matching a real partial-update request shape.
    await supertest(app.getHttpServer())
      .patch(`/cache/user/${cacheId}`)
      .send({ expiresIn: '2d' })
      .expect(200)
      .then((res) => {
        expect(res.body.data).toBe(payload.data);
      });

    await supertest(app.getHttpServer())
      .get(`/cache/user/${cacheId}`)
      .expect(200)
      .then((res) => {
        expect(res.body.data).toBe(payload.data);
      });
  });

  it('PUT /cache/user', async () => {
    const payload: CacheCreatableInterface = {
      key: 'dashboard-1',
      type: 'filter',
      data: '{}',
      expiresIn: '1d',
      assigneeId: user.id,
    };

    const cacheId = randomUUID();

    // create via PUT (id does not exist yet)
    await supertest(app.getHttpServer())
      .put(`/cache/user/${cacheId}`)
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(cacheId);
        expect(res.body.key).toBe(payload.key);
        expect(res.body.assigneeId).toBe(user.id);
      });

    // replace via PUT (same id, new data)
    payload.data = '{ "name": "John Doe" }';
    payload.expiresIn = null;

    await supertest(app.getHttpServer())
      .put(`/cache/user/${cacheId}`)
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body.id).toBe(cacheId);
        expect(res.body.key).toBe(payload.key);
        expect(res.body.data).toBe(payload.data);
        expect(res.body.assigneeId).toBe(user.id);
      });

    // verify via GET
    const url =
      `/cache/user/` +
      `?filter[0]=key||$eq||${payload.key}` +
      `&filter[1]=type||$eq||${payload.type}` +
      `&filter[2]=assigneeId||$eq||${payload.assigneeId}`;

    await supertest(app.getHttpServer())
      .get(url)
      .expect(200)
      .then((res) => {
        const response = res.body.data[0];
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
      .expect(204);
  });

  describe('@Transactional', () => {
    it('should use transaction for POST', async () => {
      const payload: CacheCreatableInterface = {
        key: 'tx-test',
        type: 'filter',
        data: '{}',
        expiresIn: '1d',
        assigneeId: user.id,
      };

      await supertest(app.getHttpServer())
        .post('/cache/user')
        .send(payload)
        .expect(201);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should use transaction for PATCH', async () => {
      const userCache = await userCacheFactory
        .map((uc) => {
          uc.assigneeId = user.id;
        })
        .create();

      await supertest(app.getHttpServer())
        .patch(`/cache/user/${userCache.id}`)
        .send({
          key: userCache.key,
          type: userCache.type,
          data: '{}',
          assigneeId: user.id,
        })
        .expect(200);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should use transaction for DELETE', async () => {
      const userCache = await userCacheFactory
        .map((uc) => {
          uc.assigneeId = user.id;
        })
        .create();

      await supertest(app.getHttpServer())
        .delete(`/cache/user/${userCache.id}`)
        .expect(204);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should NOT use transaction for GET (list)', async () => {
      await supertest(app.getHttpServer())
        .get('/cache/user?limit=1')
        .expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });

    it('should NOT use transaction for GET (read)', async () => {
      const userCache = await userCacheFactory
        .map((uc) => {
          uc.assigneeId = user.id;
        })
        .create();

      await supertest(app.getHttpServer())
        .get(`/cache/user/${userCache.id}`)
        .expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });
  });
});

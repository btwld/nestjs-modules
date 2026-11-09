import { randomUUID } from 'crypto';

import supertest from 'supertest';
import { type MockInstance } from 'vitest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { TransactionScope } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { RoleEntityFixture } from '../../../__tests__/fixtures/entities/role-entity.fixture.js';
import { type UserEntityFixture } from '../../../__tests__/fixtures/entities/user-entity.fixture.js';
import { UserFactoryFixture } from '../../../__tests__/fixtures/factories/user.factory.fixture.js';
import { RoleSeederFixture } from '../../../__tests__/fixtures/role.seeder.fixture.js';
import { RoleFactory } from '../../../infrastructure/seeding/role.factory.js';

import { AppCrudModuleFixture } from './fixtures/app-crud.module.fixture.js';

describe('RoleCrudController (e2e)', () => {
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let userFactory: UserFactoryFixture;
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

    const roleSeeder = new RoleSeederFixture({
      factories: [new RoleFactory({ entity: RoleEntityFixture })],
    });

    await seedingSource.run.one(roleSeeder);

    user = await userFactory.create();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  describe('Role CRUD', () => {
    it('GET /role', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/role?limit=2')
        .expect(200);

      expect(res.body).toEqual({
        count: 2,
        total: expect.any(Number),
        page: 1,
        pageCount: expect.any(Number),
        limit: 2,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
          }),
        ]),
      });
      expect(res.body.data.length).toBe(2);
    });

    it('GET /role/:id', async () => {
      const listRes = await supertest(app.getHttpServer())
        .get('/role?limit=1')
        .expect(200);

      const role = listRes.body.data[0];

      const res = await supertest(app.getHttpServer())
        .get(`/role/${role.id}`)
        .expect(200);

      expect(res.body).toEqual({
        id: role.id,
        name: role.name,
        description: role.description,
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: expect.any(Number),
      });
    });

    it('POST /role', async () => {
      const payload = {
        name: 'admin',
        description: 'Administrator role',
      };

      const res = await supertest(app.getHttpServer())
        .post('/role')
        .send(payload)
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'admin',
        description: 'Administrator role',
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 1,
      });
    });

    it('PATCH /role/:id', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'editor', description: 'Editor role' })
        .expect(201);

      const roleId = createRes.body.id;

      const res = await supertest(app.getHttpServer())
        .patch(`/role/${roleId}`)
        .send({ name: 'editor', description: 'Updated description' })
        .expect(200);

      expect(res.body).toEqual({
        id: roleId,
        name: 'editor',
        description: 'Updated description',
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 2,
      });
    });

    it('PATCH /role/:id does not blank name when only description is sent', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'partial-patch', description: 'Original description' })
        .expect(201);

      const roleId = createRes.body.id;

      const res = await supertest(app.getHttpServer())
        .patch(`/role/${roleId}`)
        .send({ description: 'Only description sent' })
        .expect(200);

      expect(res.body).toEqual({
        id: roleId,
        name: 'partial-patch',
        description: 'Only description sent',
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 2,
      });
    });

    it('POST /role rejects a missing name', async () => {
      await supertest(app.getHttpServer())
        .post('/role')
        .send({ description: 'No name provided' })
        .expect(400);
    });

    it('PUT /role/:id (new) rejects a missing name', async () => {
      await supertest(app.getHttpServer())
        .put(`/role/${randomUUID()}`)
        .send({})
        .expect(400);
    });

    it('PUT /role/:id (new)', async () => {
      const roleId = randomUUID();
      const payload = {
        name: 'viewer',
        description: 'Viewer role',
      };

      const res = await supertest(app.getHttpServer())
        .put(`/role/${roleId}`)
        .send(payload)
        .expect(200);

      expect(res.body).toEqual({
        id: roleId,
        name: 'viewer',
        description: 'Viewer role',
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 1,
      });
    });

    it('PUT /role/:id (existing)', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'moderator', description: 'Moderator role' })
        .expect(201);

      const roleId = createRes.body.id;

      const res = await supertest(app.getHttpServer())
        .put(`/role/${roleId}`)
        .send({ name: 'moderator', description: 'Replaced description' })
        .expect(200);

      expect(res.body).toEqual({
        id: roleId,
        name: 'moderator',
        description: 'Replaced description',
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 2,
      });
    });

    it('DELETE /role/:id', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'temp', description: 'Temporary role' })
        .expect(201);

      await supertest(app.getHttpServer())
        .delete(`/role/${createRes.body.id}`)
        .expect(204);
    });
  });

  describe('Role Assignment CRUD', () => {
    let roleId: string;

    beforeEach(async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: `role-${randomUUID()}`, description: 'Test role' })
        .expect(201);

      roleId = createRes.body.id;
    });

    it('POST /role-assignment/user', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        roleId,
        assigneeId: user.id,
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 1,
      });
    });

    it('POST /role-assignment/user duplicate should return 409', async () => {
      await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(201);

      await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(409);
    });

    it('GET /role-assignment/user', async () => {
      await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(201);

      const res = await supertest(app.getHttpServer())
        .get('/role-assignment/user?limit=10')
        .expect(200);

      expect(res.body).toEqual({
        count: expect.any(Number),
        total: expect.any(Number),
        page: 1,
        pageCount: expect.any(Number),
        limit: 10,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            roleId,
            assigneeId: user.id,
          }),
        ]),
      });
    });

    it('GET /role-assignment/user/:id', async () => {
      const assignRes = await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(201);

      const res = await supertest(app.getHttpServer())
        .get(`/role-assignment/user/${assignRes.body.id}`)
        .expect(200);

      expect(res.body).toEqual({
        id: assignRes.body.id,
        roleId,
        assigneeId: user.id,
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 1,
      });
    });

    it('DELETE /role-assignment/user/:id', async () => {
      const assignRes = await supertest(app.getHttpServer())
        .post('/role-assignment/user')
        .send({ roleId, assigneeId: user.id })
        .expect(201);

      await supertest(app.getHttpServer())
        .delete(`/role-assignment/user/${assignRes.body.id}`)
        .expect(204);
    });
  });

  describe('@Transactional', () => {
    it('should use transaction for POST /role', async () => {
      await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'tx-test', description: 'tx' })
        .expect(201);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should use transaction for PATCH /role/:id', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'tx-patch', description: 'tx' })
        .expect(201);

      txSpy.mockClear();

      await supertest(app.getHttpServer())
        .patch(`/role/${createRes.body.id}`)
        .send({ name: 'tx-patch', description: 'patched' })
        .expect(200);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should use transaction for DELETE /role/:id', async () => {
      const createRes = await supertest(app.getHttpServer())
        .post('/role')
        .send({ name: 'tx-del', description: 'tx' })
        .expect(201);

      txSpy.mockClear();

      await supertest(app.getHttpServer())
        .delete(`/role/${createRes.body.id}`)
        .expect(204);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should NOT use transaction for GET /role (list)', async () => {
      txSpy.mockClear();

      await supertest(app.getHttpServer()).get('/role?limit=1').expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });

    it('should NOT use transaction for GET /role/:id (read)', async () => {
      const listRes = await supertest(app.getHttpServer())
        .get('/role?limit=1')
        .expect(200);

      txSpy.mockClear();

      await supertest(app.getHttpServer())
        .get(`/role/${listRes.body.data[0].id}`)
        .expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });
  });
});

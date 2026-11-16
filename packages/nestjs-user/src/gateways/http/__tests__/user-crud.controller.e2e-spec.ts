import supertest from 'supertest';
import { type Repository } from 'typeorm';
import { type MockInstance } from 'vitest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';

import { TransactionScope } from '@concepta/nestjs-repository';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { UserCredentialEntityFixture } from '../../../__tests__/fixtures/entities/user-credential.entity.fixture.js';
import { UserEntityFixture } from '../../../__tests__/fixtures/entities/user.entity.fixture.js';
import { type UserEntityInterface } from '../../../domain/interfaces/user-entity.interface.js';
import { UserFactory } from '../../../infrastructure/seeding/user.factory.js';
import { UserSeeder } from '../../../infrastructure/seeding/user.seeder.js';

import { AppModuleCrudFixture } from './fixtures/app-crud.module.fixture.js';
import { FakeAuthInterceptorFixture } from './fixtures/fake-auth.interceptor.fixture.js';

describe('UserCrudController (e2e)', () => {
  let app: INestApplication;
  let seedingSource: SeedingSource;
  let txSpy: MockInstance;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleCrudFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const txScope = app.get(TransactionScope);
    txSpy = vi.spyOn(txScope, 'run');

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userSeeder = new UserSeeder({
      factories: [new UserFactory({ entity: UserEntityFixture })],
    });

    await seedingSource.run.one(userSeeder);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  describe('User CRUD', () => {
    it('GET /user', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/user?limit=10')
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
            username: expect.any(String),
            email: expect.any(String),
          }),
        ]),
      });
    });

    it('GET /user/:id', async () => {
      const listRes = await supertest(app.getHttpServer())
        .get('/user?limit=1')
        .expect(200);

      const user = listRes.body.data[0];

      const res = await supertest(app.getHttpServer())
        .get(`/user/${user.id}`)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: user.id,
          username: user.username,
          email: user.email,
        }),
      );
    });

    it('POST /user', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user1',
          email: 'user1@dispostable.com',
          password: 'password1',
        })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          username: 'user1',
          email: 'user1@dispostable.com',
        }),
      );
    });

    it('POST /user (no password)', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user1',
          email: 'user1@dispostable.com',
        })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          username: 'user1',
          email: 'user1@dispostable.com',
        }),
      );
    });

    it("POST /user (with password) actually creates a UserCredentials row (regression: the legacy UserCreateDto exposed passwordHash instead of password, so excludeAll+excludeExtraneousValues silently stripped an HTTP client's password before CreateUserHandler ever read dto.password — no credentials were ever created)", async () => {
      const credentialsRepository: Repository<UserCredentialEntityFixture> =
        app.get(getRepositoryToken(UserCredentialEntityFixture));

      const res = await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'credentialed-user',
          email: 'credentialed-user@dispostable.com',
          password: 'realpassword',
        })
        .expect(201);

      const credentials = await credentialsRepository.findOne({
        where: { userId: res.body.id },
      });

      expect(credentials).not.toBeNull();
      expect(credentials?.passwordHash).toEqual(expect.any(String));
      expect(credentials?.passwordHash.length).toBeGreaterThan(0);
    });

    it('DELETE /user/:id', async () => {
      const listRes = await supertest(app.getHttpServer())
        .get('/user?limit=1')
        .expect(200);

      await supertest(app.getHttpServer())
        .delete(`/user/${listRes.body.data[0].id}`)
        .expect(204);
    });
  });

  describe('@Transactional', () => {
    it('should use transaction for POST /user', async () => {
      await supertest(app.getHttpServer())
        .post('/user')
        .send({ username: 'tx-test', email: 'tx@test.com' })
        .expect(201);

      expect(txSpy).toHaveBeenCalled();
    });

    it('should NOT use transaction for GET /user (list)', async () => {
      txSpy.mockClear();

      await supertest(app.getHttpServer()).get('/user?limit=1').expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });

    it('should NOT use transaction for GET /user/:id (read)', async () => {
      const listRes = await supertest(app.getHttpServer())
        .get('/user?limit=1')
        .expect(200);

      txSpy.mockClear();

      await supertest(app.getHttpServer())
        .get(`/user/${listRes.body.data[0].id}`)
        .expect(200);

      expect(txSpy).not.toHaveBeenCalled();
    });
  });

  describe('Password CRUD', () => {
    let userA: UserEntityInterface;
    let userB: UserEntityInterface;
    let fakeAuth: FakeAuthInterceptorFixture;

    beforeEach(async () => {
      fakeAuth = app.get(FakeAuthInterceptorFixture);

      // Create two users with known passwords
      const resA = await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user-a',
          email: 'user-a@test.com',
          password: 'passwordA',
        })
        .expect(201);

      userA = resA.body;

      const resB = await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user-b',
          email: 'user-b@test.com',
          password: 'passwordB',
        })
        .expect(201);

      userB = resB.body;
    });

    it('PATCH /password/:id (update own password)', async () => {
      fakeAuth.user = userA;

      await supertest(app.getHttpServer())
        .patch(`/password/${userA.id}`)
        .send({ password: 'newPasswordA' })
        .expect(200);
    });

    it('PATCH /password/:id (scoped — cannot update another user)', async () => {
      fakeAuth.user = userA;

      await supertest(app.getHttpServer())
        .patch(`/password/${userB.id}`)
        .send({ password: 'hackedPassword' })
        .expect(404);
    });
  });
});

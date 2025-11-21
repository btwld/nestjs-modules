import supertest from 'supertest';

import {
  CallHandler,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  AccessControlFilter,
  AccessControlGuard,
} from '@concepta/nestjs-access-control';
import { AuthJwtGuard } from '@concepta/nestjs-auth-jwt';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { UserFactory } from '../user.factory';
import { UserSeeder } from '../user.seeder';

import { AppModuleCrudFixture } from '../__fixtures__/app.module.crud.fixture';
import { UserEntityFixture } from '../__fixtures__/user.entity.fixture';

describe('UserCrudController (e2e)', () => {
  describe('Normal CRUD flow', () => {
    let app: INestApplication;
    let seedingSource: SeedingSource;
    let authJwtGuard: AuthJwtGuard;
    let accessControlGuard: AccessControlGuard;
    let accessControlFilter: AccessControlFilter;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModuleCrudFixture],
      }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();

      authJwtGuard = app.get(AuthJwtGuard);
      jest.spyOn(authJwtGuard, 'canActivate').mockResolvedValue(true);

      accessControlGuard = app.get(AccessControlGuard);
      jest.spyOn(accessControlGuard, 'canActivate').mockResolvedValue(true);

      accessControlFilter = app.get(AccessControlFilter);
      jest
        .spyOn(accessControlFilter, 'intercept')
        .mockImplementation((_context: ExecutionContext, next: CallHandler) => {
          return Promise.resolve(next.handle());
        });

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
      jest.clearAllMocks();
      if (app) await app.close();
    });

    it('GET /user', async () => {
      await supertest(app.getHttpServer()).get('/user?limit=10').expect(200);
    });

    it('GET /user/:id', async () => {
      // get a user so we have an id
      const response = await supertest(app.getHttpServer())
        .get('/user?limit=1')
        .expect(200);

      // get one using that id
      await supertest(app.getHttpServer())
        .get(`/user/${response.body.data[0].id}`)
        .expect(200);
    });

    it('POST /user', async () => {
      await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user1',
          email: 'user1@dispostable.com',
          password: 'pass1',
        })
        .expect(201);
    });

    it('POST /user (no password)', async () => {
      await supertest(app.getHttpServer())
        .post('/user')
        .send({
          username: 'user1',
          email: 'user1@dispostable.com',
        })
        .expect(201);
    });

    it('DELETE /user/:id', async () => {
      // get a user so we have an id
      const response = await supertest(app.getHttpServer())
        .get('/user?limit=1')
        .expect(200);

      // delete one using that id
      await supertest(app.getHttpServer())
        .delete(`/user/${response.body.data[0].id}`)
        .expect(200);
    });
  });
});

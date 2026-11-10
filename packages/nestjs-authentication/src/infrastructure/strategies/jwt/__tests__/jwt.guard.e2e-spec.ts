import { sign } from 'jsonwebtoken';
import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { FIXTURE_USER } from '../../../../__tests__/fixtures/user.module.fixture.js';

import { AppModuleFixture } from './fixtures/app.module.fixture.js';

describe('JwtGuard (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /user/status', () => {
    it('should return 401 when no Authorization header is present', async () => {
      await supertest(app.getHttpServer()).get('/user/status').expect(401);
    });

    it('should return 401 when bearer token is invalid', async () => {
      await supertest(app.getHttpServer())
        .get('/user/status')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('should return 401 when token is signed with wrong secret', async () => {
      const token = sign({ sub: FIXTURE_USER.id }, 'wrong-secret');

      await supertest(app.getHttpServer())
        .get('/user/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should return 200 when bearer token is valid', async () => {
      const token = sign({ sub: FIXTURE_USER.id }, 'test-access-secret');

      await supertest(app.getHttpServer())
        .get('/user/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('AuthUserCtx', () => {
    it('is defined by the guard, so a later guard sees the user', async () => {
      const token = sign({ sub: FIXTURE_USER.id }, 'test-access-secret');

      await supertest(app.getHttpServer())
        .get('/user/ctx-in-guard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ id: FIXTURE_USER.id });
    });
  });

  describe('@AuthPublic({ optional: true })', () => {
    const valid = () => sign({ sub: FIXTURE_USER.id }, 'test-access-secret');

    it('lets a caller without a token through as nobody', async () => {
      await supertest(app.getHttpServer())
        .get('/user/optional')
        .expect(200)
        .expect({ id: null });
    });

    it('lets a caller with a bad token through as nobody, never 401', async () => {
      await supertest(app.getHttpServer())
        .get('/user/optional')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(200)
        .expect({ id: null });
      await supertest(app.getHttpServer())
        .get('/user/optional')
        .set(
          'Authorization',
          `Bearer ${sign({ sub: FIXTURE_USER.id }, 'wrong-secret')}`,
        )
        .expect(200)
        .expect({ id: null });
    });

    it('signs in a caller with a valid token', async () => {
      await supertest(app.getHttpServer())
        .get('/user/optional')
        .set('Authorization', `Bearer ${valid()}`)
        .expect(200)
        .expect({ id: FIXTURE_USER.id });
    });

    it('leaves a plain public route without a user, token or not', async () => {
      await supertest(app.getHttpServer())
        .get('/user/public')
        .set('Authorization', `Bearer ${valid()}`)
        .expect(200)
        .expect({ id: null });
    });
  });
});

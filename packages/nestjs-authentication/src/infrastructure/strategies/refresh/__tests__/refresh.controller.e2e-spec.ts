import { sign } from 'jsonwebtoken';
import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { FIXTURE_USER } from '../../../../__tests__/fixtures/user.module.fixture.js';

import { AppModuleFixture } from './fixtures/app.module.fixture.js';

describe('RefreshController (e2e)', () => {
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

  describe('POST /token/refresh', () => {
    it('should return 201 with new tokens when refresh token is valid', async () => {
      const refreshToken = sign(
        { sub: FIXTURE_USER.id },
        'test-refresh-secret',
      );

      await supertest(app.getHttpServer())
        .post('/token/refresh')
        .send({ refreshToken })
        .then((response) => {
          expect(response.status).toBe(201);
          expect(response.body.accessToken).toBeDefined();
          expect(response.body.refreshToken).toBeDefined();
        });
    });

    it('should return 401 when refresh token is invalid', async () => {
      await supertest(app.getHttpServer())
        .post('/token/refresh')
        .send({ refreshToken: 'invalid.jwt.token' })
        .expect(401);
    });

    it('should return 401 when refresh token is signed with wrong secret', async () => {
      const wrongToken = sign({ sub: FIXTURE_USER.id }, 'wrong-secret');

      await supertest(app.getHttpServer())
        .post('/token/refresh')
        .send({ refreshToken: wrongToken })
        .expect(401);
    });
  });
});

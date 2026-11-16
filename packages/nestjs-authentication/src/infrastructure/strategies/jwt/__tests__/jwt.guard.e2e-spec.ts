import { sign } from 'jsonwebtoken';
import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  FAILING_LOOKUP_SUBJECT,
  FIXTURE_USER,
} from '../../../../__tests__/fixtures/user.module.fixture.js';
import { AuthTransportUnsupportedException } from '../../../exceptions/auth-transport-unsupported.exception.js';
import { JwtGuard } from '../jwt.guard.js';

import { AppModuleFixture } from './fixtures/app.module.fixture.js';
import { OWN_GUARD_USER } from './fixtures/request-user-only.guard.fixture.js';
import { UserControllerFixtures } from './fixtures/user.controller.fixture.js';

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

  // A microservice that inherits the app's config runs the global guard on
  // its message handlers. The message is the caller's own payload, so even
  // one shaped like a request with a valid token signs nobody in.
  describe('on a message handler', () => {
    const signedMessage = () => ({
      headers: {
        authorization: `Bearer ${sign({ sub: FIXTURE_USER.id }, 'test-access-secret')}`,
      },
    });
    const contextOf = (message: object, handler: () => unknown) => {
      const context = new ExecutionContextHost(
        [message, {}],
        UserControllerFixtures,
        handler,
      );
      context.setType('rpc');
      return context;
    };

    it('refuses the call, whatever the message carries', async () => {
      const message = signedMessage();

      await expect(
        app
          .get(JwtGuard)
          .canActivate(
            contextOf(message, UserControllerFixtures.prototype.getStatus),
          ),
      ).rejects.toThrow(AuthTransportUnsupportedException);
      expect(message).not.toHaveProperty('user');
    });

    it('lets an @AuthPublic() handler through', async () => {
      await expect(
        app
          .get(JwtGuard)
          .canActivate(
            contextOf(
              signedMessage(),
              UserControllerFixtures.prototype.getPublic,
            ),
          ),
      ).resolves.toBe(true);
    });

    // An optional handler would sign a caller in, so it is the one that
    // shows the message's token is never read.
    it('lets an @AuthPublic({ optional: true }) handler through, signing nobody in', async () => {
      const message = signedMessage();

      await expect(
        app
          .get(JwtGuard)
          .canActivate(
            contextOf(message, UserControllerFixtures.prototype.getOptional),
          ),
      ).resolves.toBe(true);
      expect(message).not.toHaveProperty('user');
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

    it('is left undefined to later guards by a guard of yours setting only request.user, and defined once the guards are done', async () => {
      await supertest(app.getHttpServer())
        .get('/user/own-guard/request-user')
        .expect(200)
        .expect({ inGuard: null, inHandler: OWN_GUARD_USER.id });
    });

    it('is seen by later guards when a guard of yours defines it', async () => {
      await supertest(app.getHttpServer())
        .get('/user/own-guard/auth-user-ctx')
        .expect(200)
        .expect({ inGuard: OWN_GUARD_USER.id, inHandler: OWN_GUARD_USER.id });
    });
  });

  describe('a failing user lookup', () => {
    const failing = () =>
      sign({ sub: FAILING_LOOKUP_SUBJECT }, 'test-access-secret');

    it('is refused with a 401 on a guarded route', async () => {
      await supertest(app.getHttpServer())
        .get('/user/status')
        .set('Authorization', `Bearer ${failing()}`)
        .expect(401);
    });

    it('leaves an optional route anonymous', async () => {
      await supertest(app.getHttpServer())
        .get('/user/optional')
        .set('Authorization', `Bearer ${failing()}`)
        .expect(200)
        .expect({ id: null });
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

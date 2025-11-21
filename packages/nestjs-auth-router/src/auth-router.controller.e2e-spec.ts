import supertest from 'supertest';

import { INestApplication, CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthRouterModuleGuards } from './auth-router.constants';
import { AuthRouterModule } from './auth-router.module';

import { AuthRouterFixtureGuard } from './__fixtures__/auth-router-fixture.guards';
import { AuthRouterControllerFixture } from './__fixtures__/auth-router.controller.fixture';

describe('AuthRouterController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let guardsRecord: { google: CanActivate };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        AuthRouterModule.forRoot({
          guards: [
            {
              name: 'google',
              guard: AuthRouterFixtureGuard,
            },
          ],
        }),
      ],
      controllers: [AuthRouterControllerFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get the guards record from the module
    guardsRecord = moduleFixture.get(AuthRouterModuleGuards);
  });

  afterAll(async () => {
    await app.close();
  });

  describe(AuthRouterControllerFixture.prototype.login, () => {
    it('should call the Auth Router guard and return successfully when provider is specified', async () => {
      const googleGuard = guardsRecord.google;
      const guardSpy = jest.spyOn(googleGuard, 'canActivate');

      await supertest(app.getHttpServer())
        .get('/auth-router/login?provider=google')
        .expect(200);

      // Verify the guard was called
      expect(guardSpy).toHaveBeenCalled();

      // Verify the guard received the correct execution context
      const executionContext = guardSpy.mock.calls[0][0];
      const httpRequest = executionContext.switchToHttp().getRequest();
      expect(httpRequest.query.provider).toBe('google');
    });

    it('should return 500 when provider is missing (Auth Router exception)', async () => {
      await supertest(app.getHttpServer())
        .get('/auth-router/login')
        .expect(500);
    });

    it('should return 500 when provider is not supported (Auth Router exception)', async () => {
      await supertest(app.getHttpServer())
        .get('/auth-router/login?provider=unsupported')
        .expect(500);
    });
  });

  describe(AuthRouterControllerFixture.prototype.callback, () => {
    it('should call the Auth Router guard and return success response when provider is specified', async () => {
      const googleGuard = guardsRecord.google;
      const guardSpy = jest.spyOn(googleGuard, 'canActivate');

      const response = await supertest(app.getHttpServer())
        .get('/auth-router/callback?provider=google')
        .expect(200);

      // Verify the guard was called
      expect(guardSpy).toHaveBeenCalled();

      // Verify the response contains the expected data
      expect(response.body).toEqual({ ok: 'success' });

      // Verify the guard received the correct execution context
      const executionContext = guardSpy.mock.calls[0][0];
      const httpRequest = executionContext.switchToHttp().getRequest();
      expect(httpRequest.query.provider).toBe('google');

      // Verify the user was attached by the guard
      expect(httpRequest.user).toBeDefined();
      expect(httpRequest.user.id).toBe('fixture-user-allow');
      expect(httpRequest.user.provider).toBe('google');
    });
  });
});

import { randomUUID } from 'crypto';

import {
  DynamicModule,
  Inject,
  Injectable,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { GlobalModuleFixture } from '../__tests__/fixtures/global.module.fixture.js';
import { mockPasswordPortSettings } from '../__tests__/fixtures/ports/mock-password-port.provider.js';
import { mockUserPortSettings } from '../__tests__/fixtures/ports/mock-user-port.provider.js';
import {
  stubOtpPortSettings,
  stubRecoveryNotificationPortSettings,
  stubVerifyNotificationPortSettings,
} from '../__tests__/fixtures/ports/stub-unused-ports.fixture.js';
import { LocalService } from '../application/services/local/local.service.js';
import {
  AUTHENTICATION_JWT_PORT_TOKEN,
  AUTHENTICATION_PASSWORD_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../authentication.constants.js';
import { AuthenticationModule } from '../authentication.module.js';
import { Token } from '../domain/aggregates/token.aggregate.js';
import { JwtPolicy } from '../domain/policies/jwt.policy.js';
import { JwtPort } from '../domain/ports/jwt.port.js';
import { PasswordPort } from '../domain/ports/password.port.js';
import { UserPort } from '../domain/ports/user.port.js';
import { JwtService } from '../infrastructure/jwt/jwt.service.js';

describe(AuthenticationModule, () => {
  let testModule: TestingModule;
  let authenticationModule: AuthenticationModule;

  describe(AuthenticationModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.forRoot({
            settings: {
              jwt: {
                access: {
                  secret: 'access-secret',
                  signOptions: { expiresIn: '1h' },
                },
                refresh: {
                  secret: 'refresh-secret',
                  signOptions: { expiresIn: '7d' },
                },
              },
            },
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe('AuthenticationModule.forRoot with ports.user/ports.password (local strategy)', () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          CqrsModule,
          AuthenticationModule.forRoot({
            settings: {
              strategies: {
                local: {},
              },
            },
            ports: {
              user: mockUserPortSettings,
              password: mockPasswordPortSettings,
              otp: stubOtpPortSettings,
              recoveryNotification: stubRecoveryNotificationPortSettings,
              verifyNotification: stubVerifyNotificationPortSettings,
            },
          }),
        ],
      }).compile();
    });

    it('resolves UserPort and PasswordPort from ports config instead of null', () => {
      expect(testModule.get(AUTHENTICATION_USER_PORT_TOKEN)).toBeInstanceOf(
        UserPort,
      );
      expect(testModule.get(AUTHENTICATION_PASSWORD_PORT_TOKEN)).toBeInstanceOf(
        PasswordPort,
      );
    });

    it('does not throw AuthenticationFeatureConfigException for local strategy', () => {
      expect(testModule.get(LocalService)).toBeInstanceOf(LocalService);
    });
  });

  describe('AuthenticationModule.forRootAsync with ports.user/ports.password (local strategy)', () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          CqrsModule,
          AuthenticationModule.forRootAsync({
            inject: [],
            useFactory: () => ({
              settings: {
                strategies: {
                  local: {},
                },
              },
              ports: {
                user: mockUserPortSettings,
                password: mockPasswordPortSettings,
                otp: stubOtpPortSettings,
                recoveryNotification: stubRecoveryNotificationPortSettings,
                verifyNotification: stubVerifyNotificationPortSettings,
              },
            }),
          }),
        ],
      }).compile();
    });

    it('resolves UserPort and PasswordPort from an async ports factory instead of null', () => {
      expect(testModule.get(AUTHENTICATION_USER_PORT_TOKEN)).toBeInstanceOf(
        UserPort,
      );
      expect(testModule.get(AUTHENTICATION_PASSWORD_PORT_TOKEN)).toBeInstanceOf(
        PasswordPort,
      );
    });

    it('does not throw AuthenticationFeatureConfigException for local strategy', () => {
      expect(testModule.get(LocalService)).toBeInstanceOf(LocalService);
    });
  });

  describe(AuthenticationModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.register({
            settings: {
              jwt: {
                access: {
                  secret: 'access-secret',
                  signOptions: { expiresIn: '1h' },
                },
                refresh: {
                  secret: 'refresh-secret',
                  signOptions: { expiresIn: '7d' },
                },
              },
            },
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(AuthenticationModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.forRootAsync({
            inject: [],
            useFactory: () => ({
              settings: {
                jwt: {
                  access: {
                    secret: 'access-secret',
                    signOptions: { expiresIn: '1h' },
                  },
                  refresh: {
                    secret: 'refresh-secret',
                    signOptions: { expiresIn: '7d' },
                  },
                },
              },
            }),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(AuthenticationModule.forRootAsync, () => {
    @Injectable()
    class TestService {
      constructor(
        @Inject(JwtService)
        private readonly jwtService: JwtService,
        @Inject(JwtPolicy)
        private readonly jwtPolicy: JwtPolicy,
      ) {}

      async issueAccessToken(payload: { sub: string }) {
        const now = new Date();
        const token = new Token(randomUUID(), {
          sub: payload.sub,
          type: 'access',
          scope: [],
          iat: now,
          exp: this.jwtPolicy.getAccessExpiry(now),
        });
        return this.jwtService.signAccessToken(token);
      }

      async issueRefreshToken(payload: { sub: string }) {
        const now = new Date();
        const token = new Token(randomUUID(), {
          sub: payload.sub,
          type: 'refresh',
          scope: [],
          iat: now,
          exp: this.jwtPolicy.getRefreshExpiry(now),
        });
        return this.jwtService.signRefreshToken(token);
      }

      async verifyAccessToken(token: string) {
        return this.jwtService.verifyAccessToken(token);
      }

      async verifyRefreshToken(token: string) {
        return this.jwtService.verifyRefreshToken(token);
      }
    }

    @Module({
      imports: [
        AuthenticationModule.registerAsync({
          inject: [],
          useFactory: () => ({
            settings: {
              jwt: {
                access: {
                  secret: 'TEMP',
                  signOptions: {
                    expiresIn: '1h',
                  },
                },
                refresh: {
                  secret: 'TEMP',
                  signOptions: {
                    expiresIn: '99y',
                  },
                },
              },
            },
          }),
        }),
      ],
      providers: [TestService],
    })
    class TestModule {}

    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TestModule,
          AuthenticationModule.forRootAsync({
            inject: [],
            useFactory: () => ({
              settings: {
                jwt: {
                  access: {
                    secret: 'global-access-secret',
                    signOptions: { expiresIn: '1h' },
                  },
                  refresh: {
                    secret: 'global-refresh-secret',
                    signOptions: { expiresIn: '7d' },
                  },
                },
              },
            }),
          }),
        ]),
      ).compile();
    });

    it('should isolate TEMP secrets from global secrets - cross-verification should fail', async () => {
      commonVars();

      const globalJwtService = testModule.get(JwtService);
      const testService = testModule.get(TestService);

      const payload = { sub: 'test-user-id' };
      const globalJwtPolicy = testModule.get(JwtPolicy);

      const tempAccessToken = await testService.issueAccessToken(payload);
      const tempRefreshToken = await testService.issueRefreshToken(payload);

      const makeToken = (type: 'access' | 'refresh') => {
        const now = new Date();
        return new Token(randomUUID(), {
          sub: payload.sub,
          type,
          scope: [],
          iat: now,
          exp:
            type === 'access'
              ? globalJwtPolicy.getAccessExpiry(now)
              : globalJwtPolicy.getRefreshExpiry(now),
        });
      };

      const globalAccessToken = await globalJwtService.signAccessToken(
        makeToken('access'),
      );
      const globalRefreshToken = await globalJwtService.signRefreshToken(
        makeToken('refresh'),
      );

      // TEMP token should NOT be verifiable by global service
      await expect(
        globalJwtService.verifyAccessToken(tempAccessToken),
      ).rejects.toThrow();

      await expect(
        globalJwtService.verifyRefreshToken(tempRefreshToken),
      ).rejects.toThrow();

      // Global token should NOT be verifiable by TEMP service
      await expect(
        testService.verifyAccessToken(globalAccessToken),
      ).rejects.toThrow();

      await expect(
        testService.verifyRefreshToken(globalRefreshToken),
      ).rejects.toThrow();

      // Tokens should be verifiable by their own services
      const tempVerified = await testService.verifyAccessToken(tempAccessToken);
      const globalVerified =
        await globalJwtService.verifyAccessToken(globalAccessToken);

      expect(tempVerified).toBeDefined();
      expect(globalVerified).toBeDefined();
    });
  });

  describe(AuthenticationModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.registerAsync({
            inject: [],
            useFactory: () => ({
              settings: {
                jwt: {
                  access: {
                    secret: 'access-secret',
                    signOptions: { expiresIn: '1h' },
                  },
                  refresh: {
                    secret: 'refresh-secret',
                    signOptions: { expiresIn: '7d' },
                  },
                },
              },
            }),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  function commonVars() {
    authenticationModule = testModule.get(AuthenticationModule);
  }

  function commonTests() {
    expect(authenticationModule).toBeInstanceOf(AuthenticationModule);

    const jwtPort = testModule.get(AUTHENTICATION_JWT_PORT_TOKEN);
    expect(jwtPort).toBeInstanceOf(JwtPort);

    const jwtService = testModule.get(JwtService);
    expect(jwtService).toBeInstanceOf(JwtService);
  }
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [GlobalModuleFixture, ...extraImports],
  };
}

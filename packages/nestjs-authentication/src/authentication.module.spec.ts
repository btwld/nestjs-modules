import {
  DynamicModule,
  Inject,
  Injectable,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtModule } from '@concepta/nestjs-jwt';

import { ValidateTokenService } from './authentication.constants';
import { AuthenticationModule } from './authentication.module';
import { IssueTokenServiceInterface } from './interfaces/issue-token-service.interface';
import { ValidateTokenServiceInterface } from './interfaces/validate-token-service.interface';
import { VerifyTokenServiceInterface } from './interfaces/verify-token-service.interface';
import { IssueTokenService } from './services/issue-token.service';
import { VerifyTokenService } from './services/verify-token.service';

import { GlobalModuleFixture } from './__fixtures__/global.module.fixture';
import { IssueTokenServiceFixture } from './__fixtures__/services/issue-token.service.fixture';
import { ValidateTokenServiceFixture } from './__fixtures__/services/validate-token.service.fixture';
import { VerifyTokenServiceFixture } from './__fixtures__/services/verify-token.service.fixture';

describe(AuthenticationModule, () => {
  let testModule: TestingModule;
  let authenticationModule: AuthenticationModule;
  let issueTokenService: IssueTokenServiceInterface;
  let verifyTokenService: VerifyTokenServiceInterface;
  let validateTokenService: ValidateTokenServiceInterface;

  describe(AuthenticationModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.forRoot({
            verifyTokenService: new VerifyTokenServiceFixture(),
            issueTokenService: new IssueTokenServiceFixture(),
            validateTokenService: new ValidateTokenServiceFixture(),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(AuthenticationModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.register({
            verifyTokenService: new VerifyTokenServiceFixture(),
            issueTokenService: new IssueTokenServiceFixture(),
            validateTokenService: new ValidateTokenServiceFixture(),
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
            inject: [
              VerifyTokenServiceFixture,
              IssueTokenServiceFixture,
              ValidateTokenServiceFixture,
            ],
            useFactory: (
              verifyTokenService: VerifyTokenServiceInterface,
              issueTokenService: IssueTokenServiceInterface,
              validateTokenService: ValidateTokenServiceInterface,
            ) => ({
              verifyTokenService,
              issueTokenService,
              validateTokenService,
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
    class TestController {
      constructor(
        @Inject(IssueTokenService)
        private readonly issueTokenService: IssueTokenService,
      ) {
        // TestController with injected IssueTokenService
      }
    }
    @Injectable()
    class TestService {
      constructor(
        @Inject(IssueTokenService)
        private readonly issueTokenService: IssueTokenService,
        @Inject(VerifyTokenService)
        private readonly verifyTokenService: VerifyTokenService,
      ) {}

      // Method to issue tokens using TEMP secrets
      async issueAccessToken(payload: { sub: string }) {
        return this.issueTokenService.accessToken(payload);
      }

      async issueRefreshToken(payload: { sub: string }) {
        return this.issueTokenService.refreshToken(payload);
      }

      // Method to verify tokens using TEMP secrets
      async verifyAccessToken(token: string) {
        return this.verifyTokenService.accessToken(token);
      }

      async verifyRefreshToken(token: string) {
        return this.verifyTokenService.refreshToken(token);
      }
    }

    @Module({
      imports: [
        AuthenticationModule.registerAsync({
          imports: [
            JwtModule.forRoot({
              settings: {
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
            }),
          ],
          inject: [],
          useFactory: () => ({}),
        }),
      ],
      controllers: [TestController],
      providers: [TestService],
    })
    class TestModule {}

    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TestModule,
          AuthenticationModule.forRootAsync({
            inject: [],
            useFactory: () => ({}),
          }),
        ]),
      ).compile();
    });

    it('should isolate TEMP secrets from global secrets - cross-verification should fail', async () => {
      commonVars();

      // Get services from the main testModule (global JWT)
      // These are the services from the testModuleFactory with 'global' secrets
      const globalIssueService = issueTokenService;
      const globalVerifyService = verifyTokenService;

      // Get TestService from TestModule (which has TEMP JWT injected)
      const testService = testModule.get(TestService);

      const payload = { sub: 'test-user-id' };

      // Create token with TEMP secret (via TestService)
      const tempAccessToken = await testService.issueAccessToken(payload);
      const tempRefreshToken = await testService.issueRefreshToken(payload);

      // Create token with global secret (from main testModule)
      const globalAccessToken = await globalIssueService.accessToken(payload);
      const globalRefreshToken = await globalIssueService.refreshToken(payload);

      // Test 1: TEMP token should NOT be verifiable by global service
      await expect(
        globalVerifyService.accessToken(tempAccessToken),
      ).rejects.toThrow(); // Should fail due to wrong secret

      await expect(
        globalVerifyService.refreshToken(tempRefreshToken),
      ).rejects.toThrow(); // Should fail due to wrong secret

      // Test 2: Global token should NOT be verifiable by TEMP service (via TestService)
      await expect(
        testService.verifyAccessToken(globalAccessToken),
      ).rejects.toThrow(); // Should fail due to wrong secret

      await expect(
        testService.verifyRefreshToken(globalRefreshToken),
      ).rejects.toThrow(); // Should fail due to wrong secret

      // Test 3: But tokens should be verifiable by their own services (sanity check)
      const tempVerified = await testService.verifyAccessToken(tempAccessToken);
      const globalVerified =
        await globalVerifyService.accessToken(globalAccessToken);

      expect(tempVerified).toBeDefined();
      expect(globalVerified).toBeDefined();
    });
  });

  describe(AuthenticationModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          AuthenticationModule.registerAsync({
            inject: [
              VerifyTokenServiceFixture,
              IssueTokenServiceFixture,
              ValidateTokenServiceFixture,
            ],
            useFactory: (
              verifyTokenService: VerifyTokenServiceInterface,
              issueTokenService: IssueTokenServiceInterface,
              validateTokenService: ValidateTokenServiceInterface,
            ) => ({
              verifyTokenService,
              issueTokenService,
              validateTokenService,
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
    verifyTokenService = testModule.get(VerifyTokenService);
    issueTokenService = testModule.get(IssueTokenService);
    validateTokenService = testModule.get(ValidateTokenService);
  }

  function commonTests() {
    expect(authenticationModule).toBeInstanceOf(AuthenticationModule);
    expect(issueTokenService).toBeInstanceOf(IssueTokenServiceFixture);
    expect(verifyTokenService).toBeInstanceOf(VerifyTokenServiceFixture);
    expect(validateTokenService).toBeInstanceOf(ValidateTokenServiceFixture);
  }
});

/**
 * Factory function to create test module configuration
 *
 * @param extraImports - Additional imports to include in the test module
 */
function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [GlobalModuleFixture, JwtModule.forRoot({}), ...extraImports],
  };
}

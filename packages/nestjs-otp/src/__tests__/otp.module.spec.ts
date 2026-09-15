import { Test, type TestingModule } from '@nestjs/testing';

import { type OtpRepositoryResolverInterface } from '../domain/repositories/otp-repository-resolver.interface.js';
import { OtpRepository } from '../infrastructure/persistence/otp.repository.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../otp.constants.js';
import { OtpModule } from '../otp.module.js';

import { AppModuleFixture } from './fixtures/app.module.fixture.js';

describe(OtpModule.name, () => {
  let otpModule: OtpModule;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    otpModule = testModule.get<OtpModule>(OtpModule);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should be loaded', async () => {
      expect(otpModule).toBeInstanceOf(OtpModule);
    });
  });

  describe('register', () => {
    it('should return a dynamic module', () => {
      const result = OtpModule.register({});
      expect(result.module).toBe(OtpModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('registerAsync', () => {
    it('should return a dynamic module', () => {
      const result = OtpModule.registerAsync({});
      expect(result.module).toBe(OtpModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forRoot', () => {
    it('should return a global dynamic module', () => {
      const result = OtpModule.forRoot({});
      expect(result.module).toBe(OtpModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forRootAsync', () => {
    it('should return a global dynamic module', () => {
      const result = OtpModule.forRootAsync({});
      expect(result.module).toBe(OtpModule);
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('forFeature', () => {
    it('should return providers for each entity key', () => {
      const result = OtpModule.forFeature(['userOtp', 'emailOtp']);
      expect(result.module).toBe(OtpModule);
      expect(result.providers).toHaveLength(2);
      expect(result.exports).toHaveLength(2);
    });

    it('should resolve OtpRepository via OtpRepositoryResolver', async () => {
      const testModule: TestingModule = await Test.createTestingModule({
        imports: [AppModuleFixture],
      }).compile();

      const resolver = testModule.get<OtpRepositoryResolverInterface>(
        OTP_REPOSITORY_RESOLVER_TOKEN,
      );
      const repo = resolver.resolve('userOtp');

      expect(repo).toBeInstanceOf(OtpRepository);
    });
  });
});

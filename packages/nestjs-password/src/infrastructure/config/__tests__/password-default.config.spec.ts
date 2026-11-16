import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { type PasswordOptionsInterface } from '../interfaces/password-options.interface.js';
import { passwordDefaultConfig } from '../password-default.config.js';

describe('password configuration', () => {
  let envOriginal: NodeJS.ProcessEnv;

  beforeEach(async () => {
    envOriginal = process.env;
  });

  afterEach(async () => {
    process.env = envOriginal;
    vi.clearAllMocks();
  });

  describe(passwordDefaultConfig.name, () => {
    let moduleRef: TestingModule;

    it('should use fallbacks', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(passwordDefaultConfig)],
        providers: [],
      }).compile();

      const config: PasswordOptionsInterface =
        moduleRef.get<PasswordOptionsInterface>(passwordDefaultConfig.KEY);

      expect(config).toEqual({
        minPasswordStrength: 0,
        requireCurrentToUpdate: false,
      });
    });

    describe('passwordConfig', () => {
      it('should return defaults when called directly', async () => {
        const config = await passwordDefaultConfig();

        expect(config.minPasswordStrength).toBe(0);
      });

      it('should parse env vars as integers', async () => {
        process.env.PASSWORD_MIN_PASSWORD_STRENGTH = '2';

        moduleRef = await Test.createTestingModule({
          imports: [ConfigModule.forFeature(passwordDefaultConfig)],
          providers: [],
        }).compile();

        const config: PasswordOptionsInterface =
          moduleRef.get<PasswordOptionsInterface>(passwordDefaultConfig.KEY);

        expect(config).toEqual({
          minPasswordStrength: 2,
          requireCurrentToUpdate: false,
        });
      });

      it('should fall back to defaults for non-numeric env vars', async () => {
        process.env.PASSWORD_MIN_PASSWORD_STRENGTH = 'test';

        moduleRef = await Test.createTestingModule({
          imports: [ConfigModule.forFeature(passwordDefaultConfig)],
          providers: [],
        }).compile();

        const config: PasswordOptionsInterface =
          moduleRef.get<PasswordOptionsInterface>(passwordDefaultConfig.KEY);

        expect(config).toEqual({
          minPasswordStrength: 0,
          requireCurrentToUpdate: false,
        });
      });

      it('should use defaults when env vars are deleted', async () => {
        delete process.env.PASSWORD_MIN_PASSWORD_STRENGTH;

        moduleRef = await Test.createTestingModule({
          imports: [ConfigModule.forFeature(passwordDefaultConfig)],
          providers: [],
        }).compile();

        const config: PasswordOptionsInterface =
          moduleRef.get<PasswordOptionsInterface>(passwordDefaultConfig.KEY);

        expect(config).toEqual({
          minPasswordStrength: 0,
          requireCurrentToUpdate: false,
        });
      });
    });
  });
});

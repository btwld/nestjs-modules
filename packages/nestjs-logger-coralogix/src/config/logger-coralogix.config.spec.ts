import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { type LoggerCoralogixSettingsInterface } from '../interfaces/logger-coralogix-settings.interface';

import {
  coralogixConfig,
  LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN,
} from './logger-coralogix.config';

jest.mock('axios', () => {
  return {
    post: jest.fn(() => Promise.resolve({ data: {} })),
  };
});

jest.mock('coralogix-logger');

describe('coralogix configuration', () => {
  let envOriginal: NodeJS.ProcessEnv;

  beforeEach(async () => {
    envOriginal = process.env;
  });

  afterEach(async () => {
    process.env = envOriginal;
    jest.clearAllMocks();
  });

  describe('options token', () => {
    it('should be defined', async () => {
      expect(LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN).toEqual(
        'LOGGER_CORALOGIX_MODULE_SETTINGS_TOKEN',
      );
    });
  });

  describe('coralogixConfig()', () => {
    let moduleRef: TestingModule;

    it('should use fallbacks', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(coralogixConfig)],
        providers: [],
      }).compile();

      const config: LoggerCoralogixSettingsInterface =
        moduleRef.get<LoggerCoralogixSettingsInterface>(coralogixConfig.KEY);

      expect(config.logLevel).toEqual(['error']);
      expect(config.transportConfig.category).toEqual('');
      expect(config.transportConfig.applicationName).toEqual('');
      expect(config.transportConfig.privateKey).toEqual('');
    });

    it('should use envs', async () => {
      process.env.CORALOGIX_LOG_LEVEL = 'debug,warn';
      process.env.CORALOGIX_CATEGORY = 'category-test';
      process.env.CORALOGIX_APPLICATION_NAME = 'app-test';
      process.env.CORALOGIX_PRIVATE_KEY = 'private-key-test';
      process.env.CORALOGIX_SUBSYSTEM_NAME = 'subsystem-test';

      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(coralogixConfig)],
        providers: [],
      }).compile();

      const config: LoggerCoralogixSettingsInterface =
        moduleRef.get<LoggerCoralogixSettingsInterface>(coralogixConfig.KEY);

      expect(config.logLevel).toEqual(['debug', 'warn']);
      expect(config.transportConfig.category).toEqual('category-test');
      expect(config.transportConfig.applicationName).toEqual('app-test');
      expect(config.transportConfig.privateKey).toEqual('private-key-test');
    });
  });
});

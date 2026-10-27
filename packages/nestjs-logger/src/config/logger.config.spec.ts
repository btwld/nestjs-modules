import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { type LoggerOptionsInterface } from '../interfaces/logger-options.interface';

import { loggerConfig, LOGGER_MODULE_SETTINGS_TOKEN } from './logger.config';

jest.mock('@sentry/node');

describe('logger configuration', () => {
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
      expect(LOGGER_MODULE_SETTINGS_TOKEN).toEqual(
        'LOGGER_MODULE_SETTINGS_TOKEN',
      );
    });
  });

  describe('loggerConfig()', () => {
    let moduleRef: TestingModule;

    it('should use fallbacks', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(loggerConfig)],
        providers: [],
      }).compile();

      const config: LoggerOptionsInterface =
        moduleRef.get<LoggerOptionsInterface>(loggerConfig.KEY);

      expect(config).toMatchObject({
        logLevel: ['error'],
      });
    });

    it('should use envs', async () => {
      process.env.LOG_LEVEL = 'debug,warn';

      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(loggerConfig)],
        providers: [],
      }).compile();

      const config: LoggerOptionsInterface =
        moduleRef.get<LoggerOptionsInterface>(loggerConfig.KEY);

      expect(config).toMatchObject({
        logLevel: ['debug', 'warn'],
      });
    });
  });
});

import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  loggerSentryConfig,
  LOGGER_SENTRY_MODULE_SETTINGS_TOKEN,
} from './logger-sentry.config';

jest.mock('@sentry/node');

describe('logger-sentry configuration', () => {
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
      expect(LOGGER_SENTRY_MODULE_SETTINGS_TOKEN).toEqual(
        'LOGGER_SENTRY_MODULE_SETTINGS_TOKEN',
      );
    });
  });

  describe('loggerConfig()', () => {
    let moduleRef: TestingModule;

    it('should use fallbacks', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(loggerSentryConfig)],
        providers: [],
      }).compile();

      const config = moduleRef.get(loggerSentryConfig.KEY);

      expect(config).toMatchObject({
        logLevel: ['error'],
        logLevelMap: expect.any(Function),
        formatMessage: expect.any(Function),
        transportConfig: { dsn: '' },
      });
    });

    it('should use envs', async () => {
      process.env.SENTRY_LOG_LEVEL = 'debug,warn';
      process.env.SENTRY_DSN = 'http://fake.url';

      moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forFeature(loggerSentryConfig)],
        providers: [],
      }).compile();

      const config = moduleRef.get(loggerSentryConfig.KEY);

      expect(config).toMatchObject({
        logLevel: ['debug', 'warn'],
        logLevelMap: expect.any(Function),
        formatMessage: expect.any(Function),
        transportConfig: {
          dsn: 'http://fake.url',
        },
      });
    });

    describe('log level map', () => {
      it('loggerSentryConfig.logLevelMap', async () => {
        const settings = await loggerSentryConfig();

        if (settings && settings.transportConfig) {
          expect(settings.logLevelMap('error')).toBe('error');
          expect(settings.logLevelMap('debug')).toBe('debug');
          expect(settings.logLevelMap('log')).toBe('log');
          expect(settings.logLevelMap('warn')).toBe('warning');
          expect(settings.logLevelMap('verbose')).toBe('info');
        } else {
          throw new Error('loggerConfig is not defined');
        }
      });
    });
  });
});

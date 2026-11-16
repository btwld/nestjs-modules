import { type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { LoggerModule } from '@concepta/nestjs-logger';

import { type LoggerSentrySettingsInterface } from './interfaces/logger-sentry-settings.interface';
import { LoggerSentryModule } from './logger-sentry.module';
import { LoggerSentryTransport } from './transports/logger-sentry.transport';
import { formatMessage, logLevelMap } from './utils';

describe(LoggerSentryModule, () => {
  let testModule: TestingModule;
  let loggerModule: LoggerSentryModule;
  let loggerSentryTransport: LoggerSentryTransport;
  const SENTRY_DSN = '';

  const transportSentrySettings: LoggerSentrySettingsInterface = {
    logLevel: ['error'],
    logLevelMap: logLevelMap,
    formatMessage: formatMessage,
    transportConfig: {
      dsn: SENTRY_DSN,
    },
  };

  describe(LoggerSentryModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          LoggerSentryModule.forRoot({
            settings: transportSentrySettings,
          }),
          LoggerModule.forRootAsync({
            inject: [LoggerSentryTransport],
            useFactory: (loggerSentryTransport: LoggerSentryTransport) => {
              return {
                transports: [loggerSentryTransport],
              };
            },
          }),
        ],
      }).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerSentryModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerSentryModule.register({
            settings: transportSentrySettings,
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerSentryModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerSentryModule.forRootAsync({
            useFactory: () => ({
              settings: transportSentrySettings,
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

  describe(LoggerSentryModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerSentryModule.registerAsync({
            useFactory: () => ({
              settings: transportSentrySettings,
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
    loggerModule = testModule.get(LoggerSentryModule);
    loggerSentryTransport = testModule.get(LoggerSentryTransport);
  }

  function commonTests() {
    expect(loggerModule).toBeInstanceOf(LoggerSentryModule);
    expect(loggerSentryTransport).toBeInstanceOf(LoggerSentryTransport);
  }
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [...extraImports],
  };
}

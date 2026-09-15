import { type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { type LoggerCoralogixConfigInterface } from './interfaces/logger-coralogix-config.interface';
import { type LoggerCoralogixSettingsInterface } from './interfaces/logger-coralogix-settings.interface';
import { LoggerCoralogixModule } from './logger-coralogix.module';
import { LoggerCoralogixTransport } from './transports/logger-coralogix.transport';

jest.mock('axios', () => {
  return {
    post: jest.fn(() => Promise.resolve({ data: {} })),
  };
});

jest.mock('coralogix-logger');

describe(LoggerCoralogixModule, () => {
  const transportConfig: LoggerCoralogixConfigInterface = {
    privateKey: 'private-key',
    category: 'testers',
  };
  const transportSettings: LoggerCoralogixSettingsInterface = {
    transportConfig,
    logLevel: ['error'],
    logLevelMap: jest.fn().mockReturnValue(3),
    formatMessage: jest.fn().mockReturnValue('error'),
  };

  let testModule: TestingModule;
  let loggerCoralogixModule: LoggerCoralogixModule;
  let loggerCoralogixTransport: LoggerCoralogixTransport;

  describe(LoggerCoralogixModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [
          LoggerCoralogixModule.forRoot({
            settings: transportSettings,
          }),
        ],
      }).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerCoralogixModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerCoralogixModule.register({
            settings: transportSettings,
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerCoralogixModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerCoralogixModule.forRootAsync({
            useFactory: () => ({
              settings: transportSettings,
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

  describe(LoggerCoralogixModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerCoralogixModule.registerAsync({
            useFactory: () => ({
              settings: transportSettings,
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
    loggerCoralogixModule = testModule.get(LoggerCoralogixModule);
    loggerCoralogixTransport = testModule.get(LoggerCoralogixTransport);
  }

  function commonTests() {
    expect(loggerCoralogixModule).toBeInstanceOf(LoggerCoralogixModule);
    expect(loggerCoralogixTransport).toBeInstanceOf(LoggerCoralogixTransport);
  }
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [...extraImports],
  };
}

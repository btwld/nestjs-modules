import { type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { LoggerTransportService } from './logger-transport.service';
import { LoggerModule } from './logger.module';
import { LoggerService } from './logger.service';

describe(LoggerModule, () => {
  let testModule: TestingModule;
  let loggerModule: LoggerModule;
  let loggerService: LoggerService;
  let loggerTransportService: LoggerTransportService;

  describe(LoggerModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([LoggerModule.forRoot({})]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([LoggerModule.register({})]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerModule.forRootAsync({
            useFactory: () => ({}),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(LoggerModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          LoggerModule.registerAsync({
            useFactory: () => ({}),
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
    loggerModule = testModule.get(LoggerModule);
    loggerService = testModule.get(LoggerService);
    loggerTransportService = testModule.get(LoggerTransportService);
  }

  function commonTests() {
    expect(loggerModule).toBeInstanceOf(LoggerModule);
    expect(loggerService).toBeInstanceOf(LoggerService);
    expect(loggerTransportService).toBeInstanceOf(LoggerTransportService);
  }
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [...extraImports],
  };
}

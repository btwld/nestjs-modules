import supertest from 'supertest';

import {
  ConsoleLogger,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModuleFixture } from './__fixture__/app.module.fixture';
import { LoggerTransportInterface } from './interfaces/logger-transport.interface';
import { LoggerTransportService } from './logger-transport.service';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let loggerTransportService: LoggerTransportService;
  let spyAddTransport: jest.SpyInstance;
  let spyTransportLog: jest.SpyInstance;
  let spyDebug: jest.SpyInstance;
  let spyError: jest.SpyInstance;
  let spyLog: jest.SpyInstance;
  let spyVerbose: jest.SpyInstance;
  let spyWarn: jest.SpyInstance;
  let errorMessage: string;
  let context: string;
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    loggerService = moduleRef.get<LoggerService>(LoggerService);
    loggerTransportService = moduleRef.get<LoggerTransportService>(
      LoggerTransportService,
    );

    spyAddTransport = jest.spyOn(loggerTransportService, 'addTransport');
    spyTransportLog = jest.spyOn(loggerTransportService, 'log');

    spyDebug = jest
      .spyOn(ConsoleLogger.prototype, 'debug')
      .mockImplementation(() => null);
    spyError = jest
      .spyOn(ConsoleLogger.prototype, 'error')
      .mockImplementation(() => null);
    spyVerbose = jest
      .spyOn(ConsoleLogger.prototype, 'verbose')
      .mockImplementation(() => null);
    spyWarn = jest
      .spyOn(ConsoleLogger.prototype, 'warn')
      .mockImplementation(() => null);
    spyLog = jest
      .spyOn(ConsoleLogger.prototype, 'log')
      .mockImplementation(() => null);

    context = 'jest';
    errorMessage = 'Error Message';

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('IsDefined', () => {
    it('LoggerService', async () => {
      expect(loggerService).toBeDefined();
    });
  });

  describe('Methods', () => {
    it('loggerService.addTransport', async () => {
      await loggerService.addTransport({} as LoggerTransportInterface);
      expect(spyAddTransport).toHaveBeenCalledTimes(1);
    });

    /**
     *
     * Check if debug method was called
     *
     */
    it('loggerService.exception_debug', async () => {
      const error = new NotFoundException();
      await loggerService.exception(error);

      expect(spyDebug).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.exception_debug_message', async () => {
      const error = new NotFoundException();
      const message = 'New message';
      await loggerService.exception(error, message);

      expect(spyDebug).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledWith(message, 'debug', error);
    });

    it('loggerService.exception_error', async () => {
      await loggerService.exception(new Error());

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.error_no_stack', async () => {
      await loggerService.error(errorMessage);

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.error_with_stack', async () => {
      const err = new Error();
      await loggerService.error(errorMessage, err.stack);

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.error_with_stack_context', async () => {
      const err = new Error();
      await loggerService.error(errorMessage, err.stack, context);

      expect(spyError).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.warn', async () => {
      await loggerService.warn(errorMessage);

      expect(spyWarn).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.warn_context', async () => {
      await loggerService.warn(errorMessage, context);

      expect(spyWarn).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.debug', async () => {
      await loggerService.debug(errorMessage);

      expect(spyDebug).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.debug_context', async () => {
      await loggerService.debug(errorMessage, context);

      expect(spyDebug).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.verbose', async () => {
      await loggerService.verbose(errorMessage);

      expect(spyVerbose).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.verbose_context', async () => {
      await loggerService.verbose(errorMessage, context);

      expect(spyVerbose).toHaveBeenCalledTimes(1);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.log', async () => {
      await loggerService.log(errorMessage);

      expect(spyLog).toHaveBeenCalledWith(errorMessage, '');
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('loggerService.log_context', async () => {
      await loggerService.log(errorMessage, context);

      // This is being called twoices because of a log on module initialized
      // expect(spyLog).toHaveBeenCalledTimes(2);
      expect(spyLog).toHaveBeenCalledWith(errorMessage, context);
      expect(spyTransportLog).toHaveBeenCalledTimes(1);
    });

    it('LoggerService.log', () => {
      const spyLoggerService = jest.spyOn(loggerService, 'log');

      return supertest(app.getHttpServer())
        .get('/throw')
        .expect(500)
        .then(() => {
          expect(spyLoggerService).toHaveBeenCalledTimes(1);
          expect(spyLoggerService).toThrow();
        });
    });
  });
});

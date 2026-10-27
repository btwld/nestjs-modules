import { Logger, type LogLevel } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { LOGGER_MODULE_SETTINGS_TOKEN } from './config/logger.config';
import { type LoggerTransportInterface } from './interfaces/logger-transport.interface';
import { LoggerTransportService } from './logger-transport.service';

class TestTransport implements LoggerTransportInterface {
  logLevel: LogLevel[] | null = null;
  log(): void {
    const logger = new Logger();
    logger.log('Log to external Transport');
  }
}

describe('LoggerTransportService', () => {
  let loggerTransportService: LoggerTransportService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LoggerTransportService,
        {
          provide: LOGGER_MODULE_SETTINGS_TOKEN,
          useValue: {
            logLevel: ['error', 'warn'],
          },
        },
      ],
    }).compile();

    loggerTransportService = moduleRef.get<LoggerTransportService>(
      LoggerTransportService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('IsDefined', () => {
    it('was LoggerTransportService defined', async () => {
      expect(loggerTransportService).toBeDefined();
    });
  });

  it('loggerService.addTransport_empty', () => {
    const transports = loggerTransportService['loggerTransports'];
    expect(transports.length).toBe(0);
  });

  it('loggerService.addTransport_one', () => {
    const transport = new TestTransport();

    loggerTransportService.addTransport(transport);
    const transports = loggerTransportService['loggerTransports'];

    expect(transports.length).toBe(1);
  });

  it('loggerService.addTransport_multiple', () => {
    const transport = new TestTransport();
    const transport_2 = new TestTransport();

    loggerTransportService.addTransport(transport);
    loggerTransportService.addTransport(transport_2);

    const transports = loggerTransportService['loggerTransports'];

    expect(transports.length).toBe(2);
  });

  it('loggerService.addTransport_one_log', () => {
    const transport = new TestTransport();

    loggerTransportService.addTransport(transport);
    loggerTransportService.log('Log Info', 'log');

    const transports = loggerTransportService['loggerTransports'];

    expect(transports.length).toBe(1);
  });

  it('loggerService.addTransport_one_log', () => {
    const transport = new TestTransport();

    loggerTransportService.addTransport(transport);
    loggerTransportService.log('Error Info', 'error');

    const transports = loggerTransportService['loggerTransports'];
    const logLevels = loggerTransportService['logLevels'];

    expect(logLevels.length).toBe(2);
    expect(transports.length).toBe(1);
  });

  it('loggerService.addTransport_one_log_error', () => {
    const transport = new TestTransport();

    loggerTransportService.addTransport(transport);
    loggerTransportService.log('Error Info', 'error', new Error());

    const transports = loggerTransportService['loggerTransports'];
    const logLevels = loggerTransportService['logLevels'];

    expect(logLevels.length).toBe(2);
    expect(transports.length).toBe(1);
  });

  it('loggerService.logLevel', () => {
    const logLevels = loggerTransportService['logLevels'];
    expect(logLevels.length).toBe(2);
  });

  it('loggerService.logLevel_empty', () => {
    const loggerTransportService = new LoggerTransportService({
      logLevel: [],
    });

    const logLevels = loggerTransportService['logLevels'];
    expect(logLevels.length).toBe(0);
  });

  it('loggerService.logLevel_empty_log', () => {
    const loggerTransportService = new LoggerTransportService({
      logLevel: [],
    });

    const logLevels = loggerTransportService['logLevels'];
    const transports = loggerTransportService['loggerTransports'];

    loggerTransportService.log('Log Message', 'log' as LogLevel);

    expect(logLevels.length).toBe(0);
    expect(transports.length).toBe(0);
  });
});

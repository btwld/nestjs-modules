import { mock } from 'jest-mock-extended';

import { ArgumentsHost, INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { TestingModule, Test } from '@nestjs/testing';

import { LoggerExceptionFilter } from './logger-exception.filter';
import { LoggerTransportService } from './logger-transport.service';
import { LoggerService } from './logger.service';

describe('LoggerExceptionFilter', () => {
  let app: INestApplication;
  let loggerService: LoggerService;
  let loggerExceptionFilter: LoggerExceptionFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        LoggerExceptionFilter,
        {
          provide: LoggerTransportService,
          useValue: {
            addTransport: jest.fn(),
            log: jest.fn(),
          },
        },
        {
          provide: HttpAdapterHost,
          useValue: {
            httpAdapter: {
              isHeadersSent: jest.fn(),
              reply: jest.fn(),
              end: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    loggerService = module.get<LoggerService>(LoggerService);
    loggerExceptionFilter = module.get<LoggerExceptionFilter>(
      LoggerExceptionFilter,
    );

    await app.init();
  });

  describe('IsDefined', () => {
    it('was LoggerExceptionFilter defined', async () => {
      expect(loggerService).toBeDefined();
      expect(loggerExceptionFilter).toBeDefined();
    });
  });

  it('LoggerExceptionFilter.catch', async () => {
    const spyLoggerServiceException = jest.spyOn(loggerService, 'exception');
    loggerExceptionFilter.catch(new Error(), mock<ArgumentsHost>());

    expect(spyLoggerServiceException).toHaveBeenCalledTimes(1);
  });

  afterEach(async () => {
    await app.close();
  });
});

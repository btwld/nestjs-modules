import * as Sentry from '@sentry/node';
import { isObject } from 'class-validator';

import { BadRequestException, HttpStatus, LogLevel } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  mapHttpStatus,
  RuntimeException,
  RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { LOGGER_SENTRY_MODULE_SETTINGS_TOKEN } from '../config/logger-sentry.config';
import { LoggerSentryConfigInterface } from '../interfaces/logger-sentry-config.interface';
import { LoggerSentrySettingsInterface } from '../interfaces/logger-sentry-settings.interface';

import { LoggerSentryTransport } from './logger-sentry.transport';

jest.mock('@sentry/node');

describe('loggerSentryTransport', () => {
  let loggerSentryTransport: LoggerSentryTransport;
  let settings: LoggerSentrySettingsInterface;
  let spyInit: jest.SpyInstance;
  let spyCaptureException: jest.SpyInstance;
  let spyCaptureMessage: jest.SpyInstance;
  let spyLogLevelMap: jest.SpyInstance;
  let errorMessage: string;

  beforeEach(async () => {
    const transportSentryConfig: LoggerSentryConfigInterface = {
      dsn: 'tests-dns',
    };
    const transportSentrySettings: LoggerSentrySettingsInterface = {
      logLevel: ['error'],
      logLevelMap: jest.fn().mockReturnValue('error'),
      formatMessage: jest.fn().mockReturnValue('errorMessage'),
      transportConfig: transportSentryConfig,
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: LOGGER_SENTRY_MODULE_SETTINGS_TOKEN,
          useValue: {
            ...transportSentrySettings,
          },
        },
      ],
    }).compile();

    loggerSentryTransport = new LoggerSentryTransport(transportSentrySettings);

    settings = moduleRef.get<LoggerSentrySettingsInterface>(
      LOGGER_SENTRY_MODULE_SETTINGS_TOKEN,
    );

    spyInit = jest.spyOn(Sentry, 'init');
    spyCaptureException = jest.spyOn(Sentry, 'captureException');
    spyCaptureMessage = jest.spyOn(Sentry, 'captureMessage');
    if (settings) {
      spyLogLevelMap = jest.spyOn(settings, 'logLevelMap');
    } else {
      throw new Error('transportSentryConfig is not defined');
    }

    errorMessage = 'Jest Error Message';
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('IsDefined', () => {
    it('was loggerSentryTransport defined', async () => {
      expect(loggerSentryTransport).toBeDefined();
    });
  });

  /**
   * Test check if Sentry init was called
   */
  it('LoggerSentryTransport.init', async () => {
    expect(spyInit).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Log level map with capture exception
   */
  it('LoggerSentryTransport.captureException', async () => {
    const logLevel = 'log' as LogLevel;
    const error = new Error();
    loggerSentryTransport.log(errorMessage, logLevel, error);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyCaptureException).toHaveBeenCalledTimes(1);
  });

  /**
   * Make sure call was made correctly
   */
  it('LoggerSentryTransport.correctValues Error', async () => {
    const logLevel = 'log' as LogLevel;
    const error = new Error();
    loggerSentryTransport.log(errorMessage, logLevel, error);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyLogLevelMap).toHaveBeenCalledWith(logLevel);
    expect(spyCaptureException).toHaveBeenCalledTimes(1);
    expect(spyCaptureException).toHaveBeenCalledWith(error, {
      level: 'error',
      extra: {
        developerMessage: errorMessage,
      },
    });
  });

  /**
   * Test Log level map with capture message for string error
   */
  it('LoggerSentryTransport.correctValues string error', async () => {
    const logLevel = 'log' as LogLevel;
    const error = 'Test error';
    loggerSentryTransport.log(errorMessage, logLevel, error);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyLogLevelMap).toHaveBeenCalledWith(logLevel);
    expect(spyCaptureException).toHaveBeenCalledTimes(1);
    expect(spyCaptureException).toHaveBeenCalledWith(error, {
      level: 'error',
      extra: {
        developerMessage: errorMessage,
      },
    });
  });

  /**
   * Test Log level map with capture message for BadRequestException
   */
  it('LoggerSentryTransport.correctValues BadRequestException', async () => {
    const logLevel = 'log' as LogLevel;
    const error = new BadRequestException();
    const res = error.getResponse();
    loggerSentryTransport.log(errorMessage, logLevel, error);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyLogLevelMap).toHaveBeenCalledWith(logLevel);
    expect(spyCaptureException).toHaveBeenCalledTimes(1);
    const statusCode = error.getStatus();
    expect(spyCaptureException).toHaveBeenCalledWith(error, {
      level: 'error',
      extra: {
        developerMessage: errorMessage,
        statusCode,
        errorCode: mapHttpStatus(statusCode),
        message: isObject(res) && 'message' in res ? res.message : res,
      },
    });
  });

  /**
   * Test Log level map with capture exception
   */
  it('LoggerSentryTransport.correctValues Exception', async () => {
    class TestException extends RuntimeException {
      constructor(options?: RuntimeExceptionOptions) {
        super({
          message: 'Test Exception',
          httpStatus: HttpStatus.BAD_REQUEST,
          ...options,
        });

        this.errorCode = 'INVALID_LOGIN_DATA_ERROR';
      }
    }
    const logLevel = 'log' as LogLevel;
    const exception = new TestException();

    loggerSentryTransport.log(errorMessage, logLevel, exception);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyLogLevelMap).toHaveBeenCalledWith(logLevel);
    expect(spyCaptureException).toHaveBeenCalledTimes(1);
    expect(spyCaptureException).toHaveBeenCalledWith(exception, {
      level: 'error',
      extra: {
        developerMessage: errorMessage,
        errorCode: exception?.errorCode,
        statusCode: exception?.httpStatus,
        message: exception?.message,
        safeMessage: exception?.safeMessage,
        context: exception?.context,
      },
    });
  });

  /**
   * Test Log level map with capture message
   */
  it('LoggerSentryTransport.captureMessage', async () => {
    const logLevel = 'log' as LogLevel;

    loggerSentryTransport.log(errorMessage, logLevel);

    expect(spyLogLevelMap).toHaveBeenCalledTimes(1);
    expect(spyCaptureException).toHaveBeenCalledTimes(0);
    expect(spyCaptureMessage).toHaveBeenCalledTimes(1);
  });
});

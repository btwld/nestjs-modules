import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppErrorModuleFixture } from './__fixture__/app-error.module.fixture';
import { AppWarnModuleFixture } from './__fixture__/app-warn.module.fixture';
import { LoggerSentryTransport } from './transports/logger-sentry.transport';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let loggerSentryTransport: LoggerSentryTransport;

  it('/log should call transport log (GET)', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppErrorModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    loggerSentryTransport = moduleFixture.get<LoggerSentryTransport>(
      LoggerSentryTransport,
    );
    jest.spyOn(loggerSentryTransport, 'log');

    await supertest(app.getHttpServer()).get('/log').expect(200);

    expect(loggerSentryTransport.log).toHaveBeenCalled();
  });

  it('/log should not call transport log (GET)', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppWarnModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    loggerSentryTransport = moduleFixture.get<LoggerSentryTransport>(
      LoggerSentryTransport,
    );
    jest.spyOn(loggerSentryTransport, 'log');

    await supertest(app.getHttpServer()).get('/log').expect(200);

    expect(loggerSentryTransport.log).toHaveBeenCalledTimes(0);
  });
});

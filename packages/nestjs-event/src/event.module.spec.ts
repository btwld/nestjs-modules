import EventEmitter2 from 'eventemitter2';

import { Test, type TestingModule } from '@nestjs/testing';

import { EVENT_MODULE_EMITTER_SERVICE_TOKEN } from './event-constants';
import { EventManager } from './event-manager';
import { EventModule } from './event.module';
import { EventDispatchService } from './services/event-dispatch.service';
import { EventListenService } from './services/event-listen.service';

describe(EventModule, () => {
  let testModule: TestingModule;
  let eventModule: EventModule;
  let emitterInstance: EventEmitter2;
  let listenService: EventListenService;
  let dispatchService: EventDispatchService;
  let eventManager: EventManager;

  describe(EventModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [EventModule.forRoot({})],
      }).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(EventModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        imports: [EventModule.forRootAsync({ useFactory: () => ({}) })],
      }).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  function commonVars() {
    eventModule = testModule.get(EventModule);
    emitterInstance = testModule.get(EVENT_MODULE_EMITTER_SERVICE_TOKEN);
    listenService = testModule.get(EventListenService);
    dispatchService = testModule.get(EventDispatchService);
    eventManager = testModule.get(EventManager);
  }

  function commonTests() {
    expect(eventModule).toBeInstanceOf(EventModule);
    expect(emitterInstance).toBeInstanceOf(EventEmitter2);
    expect(listenService).toBeInstanceOf(EventListenService);
    expect(dispatchService).toBeInstanceOf(EventDispatchService);
    expect(eventManager).toBeInstanceOf(EventManager);
    expect(EventManager.dispatch).toStrictEqual(dispatchService);
    expect(EventManager.listen).toStrictEqual(listenService);
  }
});

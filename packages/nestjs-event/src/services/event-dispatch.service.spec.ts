import { EventEmitter2 } from 'eventemitter2';

import { Test } from '@nestjs/testing';

import {
  EVENT_MODULE_EMITTER_SERVICE_TOKEN,
  EVENT_MODULE_SETTINGS_TOKEN,
} from '../event-constants';
import { EventReturnType } from '../event-types';
import { Event } from '../events/event';
import { EventAsync } from '../events/event-async';
import { EventDispatchException } from '../exceptions/event-dispatch.exception';
import { EventSettingsInterface } from '../interfaces/event-settings.interface';

import { EventDispatchService } from './event-dispatch.service';

describe(EventDispatchService, () => {
  const config: EventSettingsInterface = {};
  let eventEmitter: EventEmitter2;
  let eventDispatchService: EventDispatchService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: EVENT_MODULE_EMITTER_SERVICE_TOKEN,
          useClass: EventEmitter2,
        },
        EventDispatchService,
        { provide: EVENT_MODULE_SETTINGS_TOKEN, useValue: config },
      ],
    }).compile();

    eventEmitter = moduleRef.get<EventEmitter2>(
      EVENT_MODULE_EMITTER_SERVICE_TOKEN,
    );
    eventDispatchService =
      moduleRef.get<EventDispatchService>(EventDispatchService);
  });

  it('should be provided', () => {
    expect(eventEmitter).toBeInstanceOf(EventEmitter2);
    expect(eventDispatchService).toBeInstanceOf(EventDispatchService);
  });

  describe(EventDispatchService.prototype.emit, () => {
    class TestEvent extends Event<number> {}

    it('should emit event with no listener', async () => {
      const testEvent = new TestEvent(123);
      const spy = jest.spyOn(eventEmitter, 'emit');

      const result: boolean = eventDispatchService.emit(testEvent);

      expect(result).toEqual(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);
    });

    it('should emit event with one listener', async () => {
      const testEvent = new TestEvent(456);
      const spy = jest.spyOn(eventEmitter, 'emit');
      let eventPayload: number | undefined;

      const listener = jest.fn((e: TestEvent) => {
        eventPayload = e.payload;
        return 789;
      });

      eventEmitter.on(testEvent.key, listener);

      const result: boolean = eventDispatchService.emit(testEvent);

      expect(eventPayload).toEqual(456);
      expect(result).toEqual(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(testEvent);
    });

    it('should catch exception', async () => {
      const testEvent = new TestEvent(123);

      const listener = jest.fn(() => {
        throw new Error();
      });

      eventEmitter.on(testEvent.key, listener);

      const t = () => {
        eventDispatchService.emit(testEvent);
      };

      expect(t).toThrow(EventDispatchException);
    });
  });

  describe(EventDispatchService.prototype.emitAsync, () => {
    class TestEvent extends EventAsync {}

    it('should emit an async event with no listener', async () => {
      const testEvent = new TestEvent();
      const spy = jest.spyOn(eventEmitter, 'emitAsync');

      const result: undefined[] =
        await eventDispatchService.emitAsync(testEvent);

      expect(result).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);
    });

    it('should emit an async event with one listener', async () => {
      const testEvent = new TestEvent();
      const spy = jest.spyOn(eventEmitter, 'emitAsync');
      let eventPayload: undefined;

      const listener = jest.fn(
        async (e: TestEvent): EventReturnType<TestEvent> => {
          eventPayload = e.payload;
          return;
        },
      );

      eventEmitter.on(testEvent.key, listener);

      const result: undefined[] =
        await eventDispatchService.emitAsync(testEvent);

      expect(eventPayload).toBeUndefined();
      expect(result).toEqual([undefined]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(testEvent);
    });

    it('should catch exception', async () => {
      const testEvent = new TestEvent();

      const listener = jest.fn(() => {
        throw new Error();
      });

      eventEmitter.on(testEvent.key, listener);

      await expect(eventDispatchService.emitAsync(testEvent)).rejects.toThrow(
        EventDispatchException,
      );
    });

    describe('with boolean payload', () => {
      class TestEvent extends EventAsync<boolean> {}

      it('should emit an async event with no listener', async () => {
        const testEvent = new TestEvent(true);
        const spy = jest.spyOn(eventEmitter, 'emitAsync');

        const result: boolean[] =
          await eventDispatchService.emitAsync(testEvent);

        expect(result).toEqual([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);
      });

      it('should emit an async event with one listener', async () => {
        const testEvent = new TestEvent(true);
        const spy = jest.spyOn(eventEmitter, 'emitAsync');
        let eventPayload: boolean | undefined;

        const listener = jest.fn(
          async (e: TestEvent): EventReturnType<TestEvent> => {
            eventPayload = e.payload;
            return true;
          },
        );
        eventEmitter.on(testEvent.key, listener);

        const result: boolean[] =
          await eventDispatchService.emitAsync(testEvent);

        expect(eventPayload).toEqual(true);
        expect(result).toEqual([true]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(testEvent);
      });
    });

    describe('with array payload', () => {
      type TestEventType = [boolean, number, string];
      class TestEvent extends EventAsync<TestEventType> {}

      it('should emit an async event with no listener', async () => {
        const testEvent = new TestEvent([true, 1, 'a']);
        const spy = jest.spyOn(eventEmitter, 'emitAsync');

        const result: TestEventType[] =
          await eventDispatchService.emitAsync(testEvent);

        expect(result).toEqual([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);
      });

      it('should emit an async event with one listener', async () => {
        const testEvent = new TestEvent([true, 1, 'a']);
        const spy = jest.spyOn(eventEmitter, 'emitAsync');

        const listener = jest.fn(
          async (e: TestEvent): EventReturnType<TestEvent> => {
            return e.payload;
          },
        );
        eventEmitter.on(testEvent.key, listener);

        const result: TestEventType[] =
          await eventDispatchService.emitAsync(testEvent);

        expect(result).toEqual([[true, 1, 'a']]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(testEvent);
      });
    });

    describe('with alternate return', () => {
      class TestEvent extends EventAsync<number, boolean> {}

      it('should emit an async event with alternate return type', async () => {
        const testEvent = new TestEvent(456);
        const spy = jest.spyOn(eventEmitter, 'emitAsync');

        const listener = jest.fn(async (): EventReturnType<TestEvent> => {
          return true;
        });

        eventEmitter.on(testEvent.key, listener);

        const result: boolean[] =
          await eventDispatchService.emitAsync(testEvent);

        expect(result).toEqual([true]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(testEvent.key, testEvent);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(testEvent);
      });
    });
  });
});

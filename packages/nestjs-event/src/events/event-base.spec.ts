import { EventBase } from './event-base';
import { EVENT_MODULE_EVENT_KEY_PREFIX } from '../event-constants';

describe(EventBase, () => {
  describe(EventBase.key, () => {
    class TestEvent extends EventBase {}
    it('should equal prefixed name of the class', async () => {
      expect(`${EVENT_MODULE_EVENT_KEY_PREFIX}TestEvent`).toEqual(
        TestEvent.key,
      );
    });
  });

  describe(EventBase.prototype.key, () => {
    class TestEvent extends EventBase {}
    it('should equal prefixed name of constructed class', async () => {
      const test = new TestEvent();
      expect(`${EVENT_MODULE_EVENT_KEY_PREFIX}TestEvent`).toEqual(test.key);
    });
  });

  describe(EventBase.prototype.payload, () => {
    describe('Empty', () => {
      class TestEvent extends EventBase<boolean> {}
      it('should be undefined if no payload passed to constuctor', async () => {
        const test = new TestEvent();
        expect(test.payload).toBeUndefined();
      });
    });

    describe('boolean', () => {
      class TestEvent extends EventBase<boolean> {}
      it('should equal payload passed to constructor', async () => {
        const test = new TestEvent(false);
        const testPayload = test.payload;
        expect(testPayload).toEqual(false);
      });
    });

    describe('object', () => {
      type TestEventType = { z: string };
      class TestEvent extends EventBase<TestEventType> {}

      it('should equal payload passed to constructor', async () => {
        const test = new TestEvent({ z: 'foo' });
        const testPayload: TestEventType = test.payload;
        expect(testPayload).toEqual({ z: 'foo' });
      });
    });

    describe('array', () => {
      type TestEventType = [boolean, number, string, { z: string }];
      class TestEvent extends EventBase<TestEventType> {}

      it('should equal payload passed to constructor', async () => {
        const test = new TestEvent([true, 1, 'a', { z: 'foo' }]);
        const testPayload: TestEventType = test.payload;
        expect(testPayload).toEqual([true, 1, 'a', { z: 'foo' }]);
      });
    });
  });
});

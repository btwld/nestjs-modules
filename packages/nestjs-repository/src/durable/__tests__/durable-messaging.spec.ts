import { type Type } from '@nestjs/common';
import {
  type NewOutboxMessage,
  InMemoryOutboxStore,
  Outbox,
} from '@nestjs/outbox';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost, RuntimeException } from '@concepta/nestjs-core';

import {
  WIDGET_TOKEN,
  WidgetEntityFixture,
} from '../../__fixtures__/memory/activity.fixture.js';
import { TransactionScopeFailedException } from '../../exceptions/transaction-scope-failed.exception.js';
import { RepositoryModule } from '../../repository.module.js';
import { TransactionScope } from '../../transaction/transaction-scope.js';
import { DurableMessagingModule } from '../durable-messaging.module.js';
import { DurableMessaging } from '../durable-messaging.service.js';
import { UnsupportedDurableDriverException } from '../exceptions/unsupported-durable-driver.exception.js';
import { type DurableDriverInterface } from '../interfaces/durable-driver.interface.js';

import {
  DurableDriverFixture,
  DurableMemoryRepositoryModuleFixture,
  durableStoreFixture,
  RefusingDurableDriverFixture,
} from '../__fixtures__/durable.fixture.js';

const message = (topic: string): NewOutboxMessage => ({
  topic,
  payload: { topic },
});

async function createApp(
  options: {
    key?: string;
    driver?: Type<DurableDriverInterface>;
    twice?: 'other-outbox-options' | 'same-outbox-options';
  } = {},
): Promise<TestingModule> {
  const outbox = { relay: { enabled: false } };
  const durable = DurableMessagingModule.forRoot({
    key: options.key ?? WIDGET_TOKEN,
    driver: options.driver ?? DurableDriverFixture,
    outbox,
  });

  const app = await Test.createTestingModule({
    imports: [
      RepositoryModule.forRoot({
        drivers: [
          {
            driver: DurableMemoryRepositoryModuleFixture,
            entities: [{ key: WIDGET_TOKEN, entity: WidgetEntityFixture }],
          },
        ],
      }),
      durable,
      ...(options.twice
        ? [
            DurableMessagingModule.forRoot({
              key: WIDGET_TOKEN,
              driver: DurableDriverFixture,
              outbox:
                options.twice === 'same-outbox-options' ? outbox : undefined,
            }),
          ]
        : []),
    ],
  }).compile();

  await app.init();

  return app;
}

describe(DurableMessaging.name, () => {
  let store: InMemoryOutboxStore;

  beforeEach(() => {
    store = new InMemoryOutboxStore();
    durableStoreFixture.store = store;
  });

  describe('publish', () => {
    let app: TestingModule;
    let durable: DurableMessaging;
    let txScope: TransactionScope;

    beforeEach(async () => {
      app = await createApp();
      durable = app.get(DurableMessaging);
      txScope = app.get(TransactionScope);
    });

    afterEach(async () => {
      await app.close();
    });

    it('writes the messages in the scope, and they commit with it', async () => {
      await txScope.run(new AppContextHost(), async (txCtx) => {
        await durable.publish(txCtx, [message('a'), message('b')]);
      });

      expect(store.stats(Date.now()).pending).toBe(2);
    });

    it('leaves nothing behind when the scope rolls back', async () => {
      await expect(
        txScope.run(new AppContextHost(), async (txCtx) => {
          await durable.publish(txCtx, [message('a')]);
          throw new Error('payment declined');
        }),
      ).rejects.toThrow('payment declined');

      expect(store.stats(Date.now()).pending).toBe(0);
    });

    it('wakes the relay only after the scope commits', async () => {
      const notify = vi.spyOn(app.get(Outbox), 'notify');

      await txScope.run(new AppContextHost(), async (txCtx) => {
        await durable.publish(txCtx, [message('a')]);
        expect(notify).not.toHaveBeenCalled();
      });

      expect(notify).toHaveBeenCalledTimes(1);
    });

    it('does not wake the relay when the scope rolls back', async () => {
      const notify = vi.spyOn(app.get(Outbox), 'notify');

      await expect(
        txScope.run(new AppContextHost(), async (txCtx) => {
          await durable.publish(txCtx, [message('a')]);
          throw new Error('payment declined');
        }),
      ).rejects.toThrow('payment declined');

      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    let app: TestingModule;
    let durable: DurableMessaging;
    let txScope: TransactionScope;

    beforeEach(async () => {
      app = await createApp();
      durable = app.get(DurableMessaging);
      txScope = app.get(TransactionScope);
    });

    afterEach(async () => {
      await app.close();
    });

    it('records the message and runs the work once', async () => {
      const work = vi.fn(async () => 'done');

      const first = await durable.once(
        new AppContextHost(),
        'billing',
        'm1',
        work,
      );
      const second = await durable.once(
        new AppContextHost(),
        'billing',
        'm1',
        work,
      );

      expect(first).toEqual({ duplicate: false, result: 'done' });
      expect(second).toEqual({ duplicate: true });
      expect(work).toHaveBeenCalledTimes(1);
      expect(store.hasInbox('billing', 'm1')).toBe(true);
    });

    it('hands the work the scope it runs in', async () => {
      await durable.once(
        new AppContextHost(),
        'billing',
        'm1',
        async (txCtx) => {
          await durable.publish(txCtx, [message('reply')]);
        },
      );

      expect(store.stats(Date.now()).pending).toBe(1);
    });

    it('drops the inbox record when the work throws', async () => {
      await expect(
        durable.once(new AppContextHost(), 'billing', 'm1', async () => {
          throw new Error('handler failed');
        }),
      ).rejects.toThrow('handler failed');

      expect(store.hasInbox('billing', 'm1')).toBe(false);
    });

    it("fails a joined caller's whole scope when the work throws", async () => {
      await expect(
        txScope.run(new AppContextHost(), async (txCtx) => {
          await durable.publish(txCtx, [message('earlier')]);
          await durable
            .once(txCtx, 'billing', 'm1', async () => {
              throw new Error('handler failed');
            })
            .catch(() => undefined);
        }),
      ).rejects.toThrow(TransactionScopeFailedException);

      expect(store.hasInbox('billing', 'm1')).toBe(false);
      expect(store.stats(Date.now()).pending).toBe(0);
    });
  });

  describe('startup', () => {
    it('refuses a registration its driver cannot bind', async () => {
      await expect(
        createApp({ driver: RefusingDurableDriverFixture }),
      ).rejects.toThrow(UnsupportedDurableDriverException);
    });

    it('refuses a key nothing is registered under', async () => {
      const refused = createApp({ key: 'missing' });

      await expect(refused).rejects.toThrow(UnsupportedDurableDriverException);
      await expect(refused).rejects.toThrow(
        'no repository is registered under this key',
      );
    });

    it('refuses a second forRoot() in the same application', async () => {
      const refused = createApp({ twice: 'other-outbox-options' });

      await expect(refused).rejects.toThrow(RuntimeException);
      await expect(refused).rejects.toThrow(
        'DurableMessagingModule.forRoot() is imported 2 times',
      );
    });

    it('fails startup on a second forRoot() with the same outbox options too', async () => {
      // Nest dedupes the identical OutboxModule, so @nestjs/outbox refuses
      // the second store registration before DurableMessaging's own check.
      await expect(
        createApp({ twice: 'same-outbox-options' }),
      ).rejects.toThrow();
    });
  });
});

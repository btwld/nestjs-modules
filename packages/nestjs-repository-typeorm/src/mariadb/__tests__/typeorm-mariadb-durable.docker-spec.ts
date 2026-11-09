import { OutboxRelay } from '@nestjs/outbox';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppContextHost, CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  TransactionScope,
} from '@concepta/nestjs-repository';
import {
  DurableMessaging,
  DurableMessagingModule,
} from '@concepta/nestjs-repository/optional/outbox';

import { DurableNoteEntityFixture } from '../../__fixtures__/durable/durable-note.entity.fixture.js';
import { TypeOrmDurable } from '../../durable/typeorm-durable.js';
import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { TypeOrmMariadbRepositoryModule } from '../typeorm-mariadb-repository.module.js';

/**
 * Durable messaging on a real MariaDB: the store is built on the
 * registration's data source and its messages commit and roll back with the
 * repository's writes.
 */
const NOTES_KEY = 'durable-notes';

describe('durable messaging on MariaDB', () => {
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let notes: TypeOrmRepository<DurableNoteEntityFixture>;
  let durable: DurableMessaging;
  let relay: OutboxRelay;

  const pending = async (): Promise<number> => (await relay.stats()).pending;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'mariadb',
          url:
            process.env.MARIADB_URL ??
            'mariadb://root:mariadb@localhost:53307/rockets_test',
          timezone: 'Z',
          entities: [DurableNoteEntityFixture],
          synchronize: true,
          dropSchema: true,
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmMariadbRepositoryModule,
              entities: [{ key: NOTES_KEY, entity: DurableNoteEntityFixture }],
            },
          ],
        }),
        DurableMessagingModule.forRoot({
          key: NOTES_KEY,
          driver: TypeOrmDurable,
          outbox: { relay: { enabled: false } },
        }),
      ],
    }).compile();
    await moduleFixture.init();

    txScope = moduleFixture.get(TransactionScope);
    notes = moduleFixture.get(getDynamicRepositoryToken(NOTES_KEY));
    durable = moduleFixture.get(DurableMessaging);
    relay = moduleFixture.get(OutboxRelay);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('commits a message with the write beside it', async () => {
    const before = await pending();

    await txScope.run(new AppContextHost(), async (txCtx) => {
      await notes.create({ text: 'kept' }, { ctx: txCtx });
      await durable.publish(txCtx, [
        { topic: 'note.created', payload: { text: 'kept' } },
      ]);
    });

    expect(await pending()).toBe(before + 1);
    expect(
      (await notes.find({ ctx: new AppContextHost() })).map(({ text }) => text),
    ).toContain('kept');
  });

  it('rolls a message back with the write beside it', async () => {
    const before = await pending();

    await expect(
      txScope.run(new AppContextHost(), async (txCtx) => {
        await notes.create({ text: 'dropped' }, { ctx: txCtx });
        await durable.publish(txCtx, [
          { topic: 'note.created', payload: { text: 'dropped' } },
        ]);
        throw new Error('abandon');
      }),
    ).rejects.toThrow('abandon');

    expect(await pending()).toBe(before);
    expect(
      (await notes.find({ ctx: new AppContextHost() })).map(({ text }) => text),
    ).not.toContain('dropped');
  });

  const texts = async (): Promise<string[]> =>
    (await notes.find({ ctx: new AppContextHost() })).map(({ text }) => text);

  it("runs a delivery's work once, with its write", async () => {
    const deliver = () =>
      txScope.run(new AppContextHost(), (txCtx) =>
        durable.once(txCtx, 'notes', 'm-once', async () => {
          await notes.create({ text: 'once' }, { ctx: txCtx });
          return 'done';
        }),
      );

    expect(await deliver()).toEqual({ duplicate: false, result: 'done' });
    expect(await deliver()).toEqual({ duplicate: true });
    expect((await texts()).filter((text) => text === 'once')).toHaveLength(1);
  });

  it('runs the work again after a delivery whose run rolled back', async () => {
    await expect(
      txScope.run(new AppContextHost(), async (txCtx) => {
        await durable.once(txCtx, 'notes', 'm-retry', async () => {
          await notes.create({ text: 'retry' }, { ctx: txCtx });
        });
        throw new Error('abandon');
      }),
    ).rejects.toThrow('abandon');

    const again = await txScope.run(new AppContextHost(), (txCtx) =>
      durable.once(txCtx, 'notes', 'm-retry', async () => {
        await notes.create({ text: 'retry' }, { ctx: txCtx });
      }),
    );

    expect(again).toEqual({ duplicate: false, result: undefined });
    expect((await texts()).filter((text) => text === 'retry')).toHaveLength(1);
  });
});

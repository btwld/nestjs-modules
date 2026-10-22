import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { AppContextHost } from '@concepta/nestjs-core';
import {
  AppendOnlyViolationException,
  getDynamicRepositoryToken,
  RepositoryModule,
  type TransactionContextInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { ActivityEntityFixture } from '../../__fixtures__/repository/entity/activity.entity.fixture.js';
import { AuditedStatementItemEntityFixture } from '../../__fixtures__/repository/entity/audited-statement-item.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

const ITEM_TOKEN = 'statement-item';
const ACTIVITY_TOKEN = 'activity';

/**
 * Activity records written through the driver: what the store persists, and
 * that a record commits and rolls back with the change it records inside a
 * transaction the caller opened.
 *
 * An in-memory SQLite database has one connection, so a write outside the
 * transaction would land in it too. That the record is written with the
 * caller's ctx is tested in nestjs-repository.
 */
describe('TypeOrmRepository activity (e2e)', () => {
  let moduleFixture: TestingModule;
  let txScope: TransactionScope;
  let items: TypeOrmRepository<AuditedStatementItemEntityFixture>;
  let activity: TypeOrmRepository<ActivityEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [AuditedStatementItemEntityFixture, ActivityEntityFixture],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                {
                  key: ITEM_TOKEN,
                  entity: AuditedStatementItemEntityFixture,
                  activity: { store: ACTIVITY_TOKEN, values: true },
                },
                {
                  key: ACTIVITY_TOKEN,
                  entity: ActivityEntityFixture,
                  writePolicy: {
                    access: 'append-only',
                    reason: 'activity log',
                  },
                },
              ],
            },
          ],
        }),
      ],
    }).compile();

    await moduleFixture.init();

    txScope = moduleFixture.get(TransactionScope);
    items = moduleFixture.get(getDynamicRepositoryToken(ITEM_TOKEN));
    activity = moduleFixture.get(getDynamicRepositoryToken(ACTIVITY_TOKEN));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it('indexes the store on (entityKey, recordId)', () => {
    const dataSource: DataSource = moduleFixture.get(getDataSourceToken());

    const indexed = dataSource
      .getMetadata(ActivityEntityFixture)
      .indices.map((index) =>
        index.columns.map((column) => column.propertyName),
      );

    expect(indexed).toContainEqual(['entityKey', 'recordId']);
  });

  it('stores a record whose values read back as written', async () => {
    const item = await items.create({ amount: '25.00' });

    const [record] = await activity.find();
    expect(record).toEqual({
      id: expect.any(String),
      dateCreated: expect.any(Date),
      entityKey: ITEM_TOKEN,
      urn: items.metadata.urn,
      operation: 'create',
      recordId: item.id,
      changed: [
        'dateCreated',
        'dateUpdated',
        'dateDeleted',
        'version',
        'id',
        'amount',
      ],
      values: {
        id: item.id,
        dateCreated: expect.any(String),
        dateUpdated: expect.any(String),
        dateDeleted: null,
        version: 1,
        amount: '25.00',
      },
      occurredAt: expect.any(Date),
      correlationId: null,
      actorId: null,
    });
  });

  it('records an update without the columns the database set', async () => {
    const item = await items.create({ amount: '25.00' });
    await items.update(item, { id: item.id, amount: '30.00' });

    const update = (await activity.find()).find(
      ({ operation }) => operation === 'update',
    );
    expect(update?.changed).toEqual(['amount']);
    expect(update?.values).toEqual({ amount: '30.00' });
  });

  it('records the delete date a soft delete stored', async () => {
    const item = await items.create({ amount: '25.00' });
    await items.softDelete(item);

    const records = await activity.find();
    expect(records.map(({ operation }) => operation).sort()).toEqual([
      'create',
      'softDelete',
    ]);
    const softDeleted = records.find(
      ({ operation }) => operation === 'softDelete',
    );
    expect(softDeleted?.changed).toEqual(['dateDeleted']);
    expect(softDeleted?.values?.dateDeleted).toEqual(expect.anything());
  });

  it('commits a record with the change inside a transaction', async () => {
    await txScope.run(new AppContextHost(), (txCtx) =>
      items.create({ amount: '25.00' }, { ctx: txCtx }),
    );

    expect(await items.find()).toHaveLength(1);
    expect(await activity.find()).toHaveLength(1);
  });

  it('rolls a versioned update back with its record', async () => {
    const item = await items.create({ amount: '25.00' });

    await expect(
      txScope.run(
        new AppContextHost(),
        async (txCtx: TransactionContextInterface) => {
          await items.update(
            item,
            { id: item.id, amount: '30.00' },
            { ctx: txCtx },
          );
          throw new Error('rollback me');
        },
      ),
    ).rejects.toThrow('rollback me');

    const [stored] = await items.find();
    expect(stored?.amount).toEqual('25.00');
    expect((await activity.find()).map(({ operation }) => operation)).toEqual([
      'create',
    ]);
  });

  it('rolls the change back when its record cannot be stored', async () => {
    vi.spyOn(activity, 'createMany').mockRejectedValueOnce(
      new Error('disk full'),
    );

    await expect(
      txScope.run(new AppContextHost(), (txCtx) =>
        items.create({ amount: '25.00' }, { ctx: txCtx }),
      ),
    ).rejects.toThrow();

    expect(await items.find()).toEqual([]);
  });

  it('refuses to update or delete a stored record', async () => {
    await items.create({ amount: '25.00' });
    const [record] = await activity.find();
    if (!record) throw new Error('no record stored');

    await expect(
      activity.update(record, { id: record.id, entityKey: 'other' }),
    ).rejects.toThrow(AppendOnlyViolationException);
    await expect(activity.delete(record)).rejects.toThrow(
      AppendOnlyViolationException,
    );
  });
});

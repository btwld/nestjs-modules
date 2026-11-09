import { type DataSource } from 'typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { ActivityEntityFixture } from '../../__fixtures__/repository/entity/activity.entity.fixture.js';
import { AuditedStatementItemEntityFixture } from '../../__fixtures__/repository/entity/audited-statement-item.entity.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

const ITEM_TOKEN = 'statement-item';
const ACTIVITY_TOKEN = 'activity';

/**
 * Activity records written through the driver: what the store persists. What
 * a record holds, and that it is written with the caller's ctx, is tested in
 * nestjs-repository.
 */
describe('TypeOrmRepository activity (e2e)', () => {
  let moduleFixture: TestingModule;
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
              driver: TypeOrmSqliteRepositoryModule,
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
});

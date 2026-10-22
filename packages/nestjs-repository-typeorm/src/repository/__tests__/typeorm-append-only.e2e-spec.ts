import { randomUUID } from 'node:crypto';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import { AuditedStatementItemEntityFixture } from '../../__fixtures__/repository/entity/audited-statement-item.entity.fixture.js';
import { StatementItemEntityFixture } from '../../__fixtures__/repository/entity/statement-item.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

const STATEMENT_ITEM_TOKEN = 'statement-item';
const AUDITED_STATEMENT_ITEM_TOKEN = 'audited-statement-item';

/**
 * The README requires a unique index on `correctedId` and a self-referencing
 * foreign key for a single-valued correction chain, because append-only leaves
 * `create` unguarded. These cases show the schema refusing a malformed chain
 * through the driver.
 */
describe('TypeOrmRepository append-only (e2e)', () => {
  let moduleFixture: TestingModule;
  let items: TypeOrmRepository<StatementItemEntityFixture>;
  let auditedItems: TypeOrmRepository<AuditedStatementItemEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [
            StatementItemEntityFixture,
            AuditedStatementItemEntityFixture,
          ],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                {
                  key: STATEMENT_ITEM_TOKEN,
                  entity: StatementItemEntityFixture,
                },
                {
                  key: AUDITED_STATEMENT_ITEM_TOKEN,
                  entity: AuditedStatementItemEntityFixture,
                },
              ],
            },
          ],
        }),
      ],
    }).compile();

    await moduleFixture.init();

    items = moduleFixture.get(getDynamicRepositoryToken(STATEMENT_ITEM_TOKEN));
    auditedItems = moduleFixture.get(
      getDynamicRepositoryToken(AUDITED_STATEMENT_ITEM_TOKEN),
    );
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  // The write policy startup check reads this to refuse append-only on an
  // entity that can be soft-deleted.
  it('reports a soft-delete column only where the entity has one', () => {
    expect(
      items.metadata.columns.filter((column) => column.isRemoveDate),
    ).toEqual([]);
    expect(
      auditedItems.metadata.columns
        .filter((column) => column.isRemoveDate)
        .map((column) => column.name),
    ).toEqual(['dateDeleted']);
  });

  it('accepts an original and one correction of it', async () => {
    const original = await items.create({ amount: '25.00' });
    const correction = await items.create({
      correctedId: original.id,
      reason: 'rate applied from the wrong agreement version',
      amount: '27.00',
    });

    expect(correction.correctedId).toBe(original.id);
  });

  it('accepts any number of originals, whose null correctedId stays distinct', async () => {
    await items.create({ amount: '25.00' });
    await items.create({ amount: '30.00' });

    expect(await items.find({})).toHaveLength(2);
  });

  it('fails a second correction of the same record on the unique index', async () => {
    const original = await items.create({ amount: '25.00' });
    await items.create({
      correctedId: original.id,
      reason: 'first correction',
      amount: '27.00',
    });

    const refusal = items.create({
      correctedId: original.id,
      reason: 'second correction',
      amount: '28.00',
    });

    await expect(refusal).rejects.toBeInstanceOf(RepositoryDatabaseException);
    await expect(refusal).rejects.toHaveProperty(
      'cause.message',
      expect.stringMatching(/UNIQUE constraint failed: .*\.correctedId/),
    );
  });

  it('fails a correction naming a missing record on the foreign key', async () => {
    const refusal = items.create({
      correctedId: randomUUID(),
      reason: 'orphaned correction',
      amount: '27.00',
    });

    await expect(refusal).rejects.toBeInstanceOf(RepositoryDatabaseException);
    await expect(refusal).rejects.toHaveProperty(
      'cause.message',
      expect.stringMatching(/FOREIGN KEY constraint failed/),
    );
  });
});

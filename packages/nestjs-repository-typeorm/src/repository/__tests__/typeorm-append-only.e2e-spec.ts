import { randomUUID } from 'node:crypto';

import { type DataSourceOptions } from 'typeorm';

import { Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AppendOnlyViolationException,
  EntityAlreadyExistsException,
  getDynamicRepositoryToken,
  RepositoryModule,
  RepositoryQueryException,
  resolveCorrectionChain,
  Where,
  WritePolicyBootException,
} from '@concepta/nestjs-repository';

import { AuditedStatementItemEntityFixture } from '../../__fixtures__/repository/entity/audited-statement-item.entity.fixture.js';
import { StatementItemEntityFixture } from '../../__fixtures__/repository/entity/statement-item.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

const STATEMENT_ITEM_TOKEN = 'statement-item';

const APPEND_ONLY = {
  access: 'append-only',
  reason: 'financial lineage is retained',
} as const;

/**
 * Compile, but do not start, a module over an in-memory database. The
 * write-policy boot checks run on `init()`, so callers decide whether to
 * expect it to succeed.
 */
async function compileModule(
  entities: DataSourceOptions['entities'],
  features: Parameters<typeof RepositoryModule.forFeature>[0]['entities'],
  rootOptions: Parameters<typeof RepositoryModule.forRoot>[0] = {},
): Promise<TestingModule> {
  @Module({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        synchronize: true,
        entities,
      }),
      RepositoryModule.forRoot(rootOptions),
      RepositoryModule.forFeature({
        module: TypeOrmRepositoryModule,
        entities: features,
      }),
    ],
  })
  class TestModule {}

  return Test.createTestingModule({ imports: [TestModule] }).compile();
}

/**
 * Every operation that could change a stored row. Each payload is otherwise
 * valid, so only the write policy can be what refuses it.
 */
const STORED_ROW_OPERATIONS: [
  string,
  (
    items: TypeOrmRepository<StatementItemEntityFixture>,
    row: StatementItemEntityFixture,
  ) => Promise<unknown>,
][] = [
  ['update', (items, row) => items.update(row, { amount: '26.00' })],
  ['replace', (items, row) => items.replace(row, { amount: '26.00' })],
  ['upsert', (items, row) => items.upsert({ id: row.id, amount: '26.00' })],
  ['delete', (items, row) => items.delete(row)],
  ['deleteMany', (items, row) => items.deleteMany([row])],
  ['softDelete', (items, row) => items.softDelete(row)],
  ['restore', (items, row) => items.restore(row)],
];

/**
 * The README calls a unique index on `correctedId` and a self-referencing
 * foreign key _required_ for a single-valued correction chain, because
 * append-only leaves `create` unguarded. The lineage cases show the schema,
 * not the repository, is what refuses a malformed chain.
 */
describe('TypeOrmRepository append-only (e2e)', () => {
  let moduleFixture: TestingModule;
  let items: TypeOrmRepository<StatementItemEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await compileModule(
      [StatementItemEntityFixture],
      [
        {
          key: STATEMENT_ITEM_TOKEN,
          entity: StatementItemEntityFixture,
          writePolicy: APPEND_ONLY,
        },
      ],
    );

    await moduleFixture.init();

    items = moduleFixture.get<TypeOrmRepository<StatementItemEntityFixture>>(
      getDynamicRepositoryToken(STATEMENT_ITEM_TOKEN),
    );
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it.each(STORED_ROW_OPERATIONS)(
    'refuses %s with a 409 and leaves the row unchanged',
    async (_operation, run) => {
      const row = await items.create({ amount: '25.00' });

      const refusal = run(items, row);

      await expect(refusal).rejects.toBeInstanceOf(
        AppendOnlyViolationException,
      );
      await expect(refusal).rejects.toHaveProperty('httpStatus', 409);

      const stored = await items.findOne({ where: Where.eq('id', row.id) });
      expect(stored?.amount).toBe('25.00');
    },
  );

  it('refuses a create that reuses an existing id rather than updating', async () => {
    const row = await items.create({ amount: '25.00' });

    await expect(
      items.create({ id: row.id, amount: '99.00' }),
    ).rejects.toBeInstanceOf(EntityAlreadyExistsException);
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

  it('resolves an original to the end of its correction chain', async () => {
    const original = await items.create({ amount: '25.00' });
    const first = await items.create({
      correctedId: original.id,
      reason: 'first correction',
      amount: '27.00',
    });
    const second = await items.create({
      correctedId: first.id,
      reason: 'second correction',
      amount: '28.00',
    });

    const effective = await resolveCorrectionChain(items, original);

    expect(effective.id).toBe(second.id);
  });

  it('accepts any number of originals, whose null correctedId stays distinct', async () => {
    await items.create({ amount: '25.00' });
    await items.create({ amount: '30.00' });

    expect(await items.find({})).toHaveLength(2);
  });

  it('refuses a second correction of the same record', async () => {
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

    await expect(refusal).rejects.toBeInstanceOf(RepositoryQueryException);
    await expect(refusal).rejects.toHaveProperty(
      'cause.message',
      expect.stringMatching(/UNIQUE constraint failed: .*\.correctedId/),
    );
  });

  it('refuses a correction naming a record that does not exist', async () => {
    const refusal = items.create({
      correctedId: randomUUID(),
      reason: 'orphaned correction',
      amount: '27.00',
    });

    await expect(refusal).rejects.toBeInstanceOf(RepositoryQueryException);
    await expect(refusal).rejects.toHaveProperty(
      'cause.message',
      expect.stringMatching(/FOREIGN KEY constraint failed/),
    );
  });
});

describe('write policy startup checks (e2e)', () => {
  it('refuses append-only on an entity with a soft-delete column', async () => {
    const moduleRef = await compileModule(
      [AuditedStatementItemEntityFixture],
      [
        {
          key: STATEMENT_ITEM_TOKEN,
          entity: AuditedStatementItemEntityFixture,
          writePolicy: APPEND_ONLY,
        },
      ],
    );

    await expect(moduleRef.init()).rejects.toBeInstanceOf(
      WritePolicyBootException,
    );
  });

  it('refuses an undeclared entity when declarations are required', async () => {
    const moduleRef = await compileModule(
      [StatementItemEntityFixture],
      [{ key: STATEMENT_ITEM_TOKEN, entity: StatementItemEntityFixture }],
      { requireWritePolicyDeclaration: true },
    );

    await expect(moduleRef.init()).rejects.toBeInstanceOf(
      WritePolicyBootException,
    );
  });

  it('starts when every entity declares a policy', async () => {
    const moduleRef = await compileModule(
      [StatementItemEntityFixture],
      [
        {
          key: STATEMENT_ITEM_TOKEN,
          entity: StatementItemEntityFixture,
          writePolicy: APPEND_ONLY,
        },
      ],
      { requireWritePolicyDeclaration: true },
    );

    await expect(moduleRef.init()).resolves.toBeDefined();
    await moduleRef.close();
  });
});

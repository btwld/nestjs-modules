import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';

const noteTable = pgTable('commit_note', {
  id: text().primaryKey(),
  rank: integer().notNull(),
});

class NoteEntity {
  declare id: string;
  declare rank: number;
}

@Module({})
class CommitRootModule {}

describe('DrizzlePostgresTransaction commit', () => {
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;
  let txScope: TransactionScope;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: CommitRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({ client: new PGlite() });
              await db.execute(sql`create table commit_note (
                id text primary key,
                rank integer not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
                entities: [
                  { key: 'note', entity: NoteEntity, table: noteTable },
                ],
              },
            ],
          }),
        ],
      },
      { abortOnError: false },
    );
    notes = app.get(getDynamicRepositoryToken('note'));
    txScope = app.get(TransactionScope);
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses to commit a transaction a failed statement ended, writing nothing', async () => {
    const committed = vi.fn();
    const rolledBack = vi.fn();

    const run = txScope.run({}, async (txCtx) => {
      txCtx.trx.onCommit(committed);
      txCtx.trx.onRollback(rolledBack);
      await notes.create({ id: 'kept', rank: 1 }, { ctx: txCtx });
      // A failed insert the caller handles: Postgres has ended the
      // transaction all the same.
      await notes
        .create({ id: 'unranked' }, { ctx: txCtx })
        .catch(() => undefined);
      return 'done';
    });

    await expect(run).rejects.toThrow('current transaction is aborted');
    expect(await notes.find()).toEqual([]);
    expect([committed.mock.calls.length, rolledBack.mock.calls.length]).toEqual(
      [0, 1],
    );
  });

  it('commits a transaction whose statements all succeeded', async () => {
    await txScope.run({}, (txCtx) =>
      notes.create({ id: 'saved', rank: 1 }, { ctx: txCtx }),
    );

    expect(await notes.find()).toEqual([{ id: 'saved', rank: 1 }]);
  });
});

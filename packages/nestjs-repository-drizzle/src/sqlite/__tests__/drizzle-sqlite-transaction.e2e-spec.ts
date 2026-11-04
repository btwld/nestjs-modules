import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
  TransactionDoomedException,
  TransactionScope,
  TransactionTimeoutException,
} from '@concepta/nestjs-repository';

import { DRIZZLE_DEFAULT_CONNECTION_NAME } from '../../drizzle-repository.constants.js';
import {
  DrizzleSqliteRepositoryModule,
  toDrizzleSqliteClient,
} from '../drizzle-sqlite-repository.module.js';

const noteTable = sqliteTable('gate_note', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

class NoteEntity {
  declare id: number;
  declare name: string;
}

@Module({})
class SqliteRootModule {}

class Rollback extends Error {}

/** A promise and the function that settles it. */
function signal(): { done: Promise<void>; fire: () => void } {
  let fire: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    fire = resolve;
  });
  return { done, fire };
}

describe('DrizzleSqliteRepository on one connection', () => {
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;
  let scope: TransactionScope;

  beforeEach(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: SqliteRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => {
              const db = drizzle(':memory:');
              db.run(sql`create table gate_note (
                id integer primary key autoincrement,
                name text not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzleSqliteRepositoryModule,
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
    scope = app.get(TransactionScope);
  });

  afterEach(async () => {
    await app.close();
  });

  it("keeps another caller's write out of a transaction that rolls back", async () => {
    const written = signal();
    const release = signal();

    const run = scope.run({}, async (txCtx) => {
      await notes.create({ name: 'inside' }, { ctx: txCtx });
      written.fire();
      await release.done;
      throw new Rollback();
    });
    await written.done;
    let settled = false;
    const outside = notes
      .create({ name: 'outside' })
      .finally(() => (settled = true));
    // Long enough for the write to reach the connection, were it not
    // waiting for the transaction to end.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(settled).toBe(false);
    release.fire();

    await expect(run).rejects.toThrow(Rollback);
    await outside;
    expect((await notes.find()).map(({ name }) => name)).toEqual(['outside']);
  });

  it('fails a run whose statement fills the database, keeping none of its writes', async () => {
    const db = toDrizzleSqliteClient(
      app.get(getDrizzleToken()),
      DRIZZLE_DEFAULT_CONNECTION_NAME,
    );
    // SQLite may roll the transaction back when the database is full; the
    // run fails either way.
    const pages = db.get<{ page_count: number }>(sql`pragma page_count`);
    db.run(sql.raw(`pragma max_page_count = ${pages?.page_count ?? 0}`));

    let full: unknown;
    const run = scope.run({}, async (txCtx) => {
      await notes.create({ name: 'before' }, { ctx: txCtx });
      full = await notes
        .create({ name: 'x'.repeat(100_000) }, { ctx: txCtx })
        .catch((error: unknown) => error);
      await notes.create({ name: 'after' }, { ctx: txCtx });
    });

    await expect(run).rejects.toThrow(TransactionDoomedException);
    expect(full).toBeInstanceOf(RepositoryDatabaseException);
    expect(full).toHaveProperty('context.code', 'SQLITE_FULL');
    expect(await notes.find()).toEqual([]);
  });

  it('runs two transactions one after the other', async () => {
    // Without serialization, the second BEGIN would fail inside the first.
    const runs = ['first', 'second'].map((name) =>
      scope.run({}, async (txCtx) => {
        await notes.create({ name }, { ctx: txCtx });
        await notes.create({ name: `${name} again` }, { ctx: txCtx });
      }),
    );

    await Promise.all(runs);
    expect(await notes.count()).toBe(4);
  });

  it('ends a run that times out waiting for another, leaving none of its writes', async () => {
    const holding = signal();
    const release = signal();
    const holder = scope.run({}, async (txCtx) => {
      await notes.create({ name: 'holder' }, { ctx: txCtx });
      holding.fire();
      await release.done;
    });
    await holding.done;

    const startedAt = Date.now();
    await expect(
      scope.run(
        {},
        (txCtx) => notes.create({ name: 'waiter' }, { ctx: txCtx }),
        { timeout: 50 },
      ),
    ).rejects.toThrow(TransactionTimeoutException);
    expect(Date.now() - startedAt).toBeLessThan(400);

    release.fire();
    await holder;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await notes.find()).map(({ name }) => name)).toEqual(['holder']);
  });

  it('holds a call made without the run context inside a run until the run times out', async () => {
    let stray: Promise<NoteEntity> | undefined;

    await expect(
      scope.run(
        {},
        async (txCtx) => {
          await notes.create({ name: 'inside' }, { ctx: txCtx });
          stray = notes.create({ name: 'stray' });
          await stray;
        },
        { timeout: 100 },
      ),
    ).rejects.toThrow(TransactionTimeoutException);

    // It runs once the run's transaction has rolled back.
    await stray;
    expect((await notes.find()).map(({ name }) => name)).toEqual(['stray']);
  });
});

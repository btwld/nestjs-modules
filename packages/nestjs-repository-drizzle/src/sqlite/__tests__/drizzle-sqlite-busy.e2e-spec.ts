import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { DrizzleSqliteRepositoryModule } from '../drizzle-sqlite-repository.module.js';

const noteTable = sqliteTable('busy_note', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  version: integer().notNull(),
});

class NoteEntity {
  declare id: number;
  declare name: string;
  declare version: number;
}

@Module({})
class BusyRootModule {}

/** Whether `error` is the database reporting another connection's lock. */
function isBusy(error: unknown): boolean {
  return (
    error instanceof RepositoryDatabaseException &&
    error.context.database === 'sqlite' &&
    error.context.code === 'SQLITE_BUSY'
  );
}

describe('DrizzleSqliteRepository on a database another connection holds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drizzle-sqlite-busy-'));
  const file = join(dir, 'busy.db');
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;
  let scope: TransactionScope;
  let other: Database.Database;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: BusyRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => {
              // Give up on a lock after 100 ms rather than better-sqlite3's 5 s.
              const db = drizzle({
                client: new Database(file, { timeout: 100 }),
              });
              db.run(sql`create table busy_note (
                id integer primary key autoincrement,
                name text not null,
                version integer not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzleSqliteRepositoryModule,
                entities: [
                  {
                    key: 'note',
                    entity: NoteEntity,
                    table: noteTable,
                    version: 'version',
                  },
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
    other = new Database(file);
  });

  afterAll(async () => {
    other.close();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports the lock as SQLITE_BUSY when a write's own transaction cannot begin", async () => {
    const note = await notes.create({ name: 'a' });
    other.prepare('begin immediate').run();
    try {
      await expect(notes.update(note, { name: 'b' })).rejects.toSatisfy(isBusy);
      await expect(
        scope.run({}, (txCtx) => notes.create({ name: 'c' }, { ctx: txCtx })),
      ).rejects.toSatisfy(isBusy);
    } finally {
      other.prepare('rollback').run();
    }
    expect((await notes.find()).map(({ name }) => name)).toEqual(['a']);
  });
});

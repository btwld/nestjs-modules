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
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { DrizzleSqliteRepositoryModule } from '../drizzle-sqlite-repository.module.js';

const noteTable = sqliteTable('outside_note', {
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
class OutsideRunRootModule {}

describe('DrizzleSqliteRepository outside a run', () => {
  const queries: string[] = [];
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: OutsideRunRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => {
              const db = drizzle({
                client: new Database(':memory:'),
                logger: { logQuery: (query) => queries.push(query) },
              });
              db.run(sql`create table outside_note (
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens no transaction of its own for a write', async () => {
    const note = await notes.create({ name: 'a' });
    queries.length = 0;

    const updated = await notes.update(note, { name: 'b' });
    await notes.update(updated, { name: 'c' }, { expectedVersion: 2 });
    await notes.upsert({ id: note.id, name: 'd' });
    await notes.upsert({ name: 'e' });

    expect(queries.filter((query) => /^begin/i.test(query))).toEqual([]);
    expect((await notes.find()).map(({ name }) => name).sort()).toEqual([
      'd',
      'e',
    ]);
  });
});

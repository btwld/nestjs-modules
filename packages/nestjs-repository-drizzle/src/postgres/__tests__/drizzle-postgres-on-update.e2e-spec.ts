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
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';

/** A column Drizzle counts up on every update it builds. */
const noteTable = pgTable('touched_note', {
  id: text().primaryKey(),
  label: text().notNull(),
  touched: integer()
    .notNull()
    .default(0)
    .$onUpdate(() => sql`touched + 1`),
  version: integer().notNull(),
});

class NoteEntity {
  declare id: string;
  declare label: string;
  declare touched: number;
  declare version: number;
}

@Module({})
class OnUpdateRootModule {}

describe('DrizzlePostgresRepository with an $onUpdate column', () => {
  let app: INestApplicationContext;
  let notes: RepositoryInterface<NoteEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: OnUpdateRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({ client: new PGlite() });
              await db.execute(sql`create table touched_note (
                id text primary key,
                label text not null,
                touched integer not null default 0,
                version integer not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
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

  it('stamps it once for each write that changes the row, and never for one that does not', async () => {
    // Drizzle fills a left-out `$onUpdate` column on insert too.
    await notes.upsert({ id: 'n', label: 'a', touched: 0 });
    const same = await notes.upsert({ id: 'n', label: 'a' });
    const changed = await notes.upsert({ id: 'n', label: 'b' });

    expect([same, changed]).toEqual([
      { id: 'n', label: 'a', touched: 0, version: 1 },
      { id: 'n', label: 'b', touched: 1, version: 2 },
    ]);
  });
});

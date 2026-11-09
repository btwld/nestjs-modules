import { sql } from 'drizzle-orm';
import { jsonb, pgTable, serial, text } from 'drizzle-orm/pg-core';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import {
  DrizzlePostgresRepositoryModule,
  toDrizzlePostgresClient,
} from '../drizzle-postgres-repository.module.js';

import { type DrizzlePostgresConnect } from './drizzle-postgres-connect.type.js';

const noteTable = pgTable('select_note', {
  id: serial().primaryKey(),
  title: text().notNull(),
  body: jsonb().notNull(),
});

class NoteEntity {
  declare id: number;
  declare title: string;
  declare body: unknown;
}

@Module({})
class SelectRootModule {}

/**
 * How the Postgres adapter translates reads beyond the conformance suite,
 * on the database `connect` creates: the SQL a select sends, and empty
 * compounds.
 */
export function describeDrizzlePostgresReads(
  name: string,
  connect: DrizzlePostgresConnect,
): void {
  describe(name, () => {
    const queries: string[] = [];
    let app: INestApplicationContext;
    let notes: RepositoryInterface<NoteEntity>;

    beforeAll(async () => {
      app = await NestFactory.createApplicationContext(
        {
          module: SelectRootModule,
          imports: [
            CoreModule.forRoot(),
            DrizzleModule.forRootAsync({
              useFactory: async () => {
                const db = toDrizzlePostgresClient(
                  connect({
                    logger: { logQuery: (query) => queries.push(query) },
                  }),
                  'default',
                );
                await db.execute(sql`drop table if exists select_note`);
                await db.execute(sql`create table select_note (
                id serial primary key,
                title text not null,
                body jsonb not null
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
    });

    afterAll(async () => {
      await app.close();
    });

    it('reads only the columns a select names', async () => {
      await notes.create({ title: 'a', body: { large: true } });
      queries.length = 0;

      const found = await notes.find({ select: ['id', 'title'] });

      expect(found.map(({ title }) => title)).toEqual(['a']);
      expect(queries).toEqual(['select "id", "title" from "select_note"']);
    });
  });
}

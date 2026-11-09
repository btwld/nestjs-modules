import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';
import { type DrizzlePostgresClient } from '../drizzle-postgres.types.js';

const noteTable = pgTable('outside_note', {
  id: serial().primaryKey(),
  name: text().notNull(),
  version: integer().notNull(),
});

const plainTable = pgTable('outside_plain', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

class NoteEntity {
  declare id: number;
  declare name: string;
  declare version: number;
}

class PlainEntity {
  declare id: number;
  declare name: string;
}

@Module({})
class OutsideRunRootModule {}

describe('DrizzlePostgresRepository outside a run', () => {
  let app: INestApplicationContext;
  let db: DrizzlePostgresClient;
  let notes: RepositoryInterface<NoteEntity>;
  let plains: RepositoryInterface<PlainEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: OutsideRunRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({ client: new PGlite() });
              await db.execute(sql`create table outside_note (
                id serial primary key,
                name text not null,
                version integer not null
              )`);
              await db.execute(sql`create table outside_plain (
                id serial primary key,
                name text not null
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
                  { key: 'plain', entity: PlainEntity, table: plainTable },
                ],
              },
            ],
          }),
        ],
      },
      { abortOnError: false },
    );
    db = app.get(getDrizzleToken());
    notes = app.get(getDynamicRepositoryToken('note'));
    plains = app.get(getDynamicRepositoryToken('plain'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens no transaction of its own for a write', async () => {
    const note = await notes.create({ name: 'a' });
    const plain = await plains.create({ name: 'a' });
    const transaction = vi.spyOn(db, 'transaction');

    const updated = await notes.update(note, { name: 'b' });
    await notes.update(updated, { name: 'c' }, { expectedVersion: 2 });
    await notes.upsert({ id: note.id, name: 'd' });
    await notes.upsert({ name: 'e' });
    await plains.update(plain, { name: 'b' });
    await notes.createMany([{ name: 'f' }, { name: 'g' }]);

    expect(transaction).not.toHaveBeenCalled();
    transaction.mockRestore();
  });
});

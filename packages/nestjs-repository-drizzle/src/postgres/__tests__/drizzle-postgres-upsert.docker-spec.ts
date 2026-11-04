import { sql } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import {
  toDrizzlePostgresClient,
  DrizzlePostgresRepositoryModule,
} from '../drizzle-postgres-repository.module.js';

import { nodePostgresDatabase } from '../__fixtures__/postgres-databases.fixture.js';

/** Unique columns besides the key, without and with a version. */
const plainTable = pgTable('drizzle_upsert_plain', {
  id: text().primaryKey(),
  label: text().notNull().unique(),
  extra: text().notNull(),
});

const versionedTable = pgTable('drizzle_upsert_versioned', {
  id: text().primaryKey(),
  label: text().notNull().unique(),
  version: integer().notNull(),
});

class PlainEntity {
  declare id: string;
  declare label: string;
  declare extra: string;
}

class VersionedEntity {
  declare id: string;
  declare label: string;
  declare version: number;
}

@Module({})
class UpsertRootModule {}

describe('DrizzlePostgresRepository upsert on Postgres', () => {
  let app: INestApplicationContext;
  let plains: RepositoryInterface<PlainEntity>;
  let versioned: RepositoryInterface<VersionedEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: UpsertRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = toDrizzlePostgresClient(
                nodePostgresDatabase({}),
                'default',
              );
              await db.execute(sql`
                drop table if exists drizzle_upsert_plain, drizzle_upsert_versioned
              `);
              await db.execute(sql`create table drizzle_upsert_plain (
                id text primary key,
                label text not null unique,
                extra text not null
              )`);
              await db.execute(sql`create table drizzle_upsert_versioned (
                id text primary key,
                label text not null unique,
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
                  { key: 'plain', entity: PlainEntity, table: plainTable },
                  {
                    key: 'versioned',
                    entity: VersionedEntity,
                    table: versionedTable,
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
    plains = app.get(getDynamicRepositoryToken('plain'));
    versioned = app.get(getDynamicRepositoryToken('versioned'));
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    [
      'without',
      (id: string, caller: number): Promise<unknown> =>
        plains.upsert({ id, label: id, extra: `${caller}` }),
    ],
    [
      'with',
      (id: string): Promise<unknown> => versioned.upsert({ id, label: id }),
    ],
  ])(
    'upserts a new key from several callers at once %s a version, every one succeeding',
    async (versioning, upsert) => {
      const failures: unknown[] = [];
      for (let round = 0; round < 20; round++) {
        const id = `fresh-${versioning}-${round}`;
        const results = await Promise.allSettled(
          [0, 1, 2, 3].map((caller) => upsert(id, caller)),
        );
        failures.push(
          ...results.flatMap((result) =>
            result.status === 'rejected' ? [result.reason] : [],
          ),
        );
      }

      expect(failures).toEqual([]);
    },
  );

  it('refuses an upsert whose new key duplicates another unique column, writing no other row', async () => {
    await plains.create({ id: 'a', label: 'taken', extra: 'one' });

    await expect(
      plains.upsert({ id: 'b', label: 'taken', extra: 'two' }),
    ).rejects.toThrow(RepositoryDatabaseException);
    expect(
      await plains
        .find({ where: undefined })
        .then((rows) => rows.filter(({ label }) => label === 'taken')),
    ).toEqual([{ id: 'a', label: 'taken', extra: 'one' }]);
  });
});

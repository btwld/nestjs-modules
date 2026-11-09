import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  blob,
  integer,
  numeric,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

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

/** Columns SQLite stores as another type, or rounds, on the way in. */
const shapeTable = sqliteTable('version_shape', {
  id: integer().primaryKey({ autoIncrement: true }),
  data: text({ mode: 'json' }).$type<{ tags: string[] }>().notNull(),
  done: integer({ mode: 'boolean' }).notNull(),
  seenAt: integer({ mode: 'timestamp' }).notNull(),
  stampedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  bytes: blob({ mode: 'buffer' }).notNull(),
  amount: numeric().notNull(),
  version: integer().notNull(),
});

class ShapeEntity {
  declare id: number;
  declare data: { tags: string[] };
  declare done: boolean;
  declare seenAt: Date;
  declare stampedAt: Date;
  declare bytes: Buffer;
  declare amount: string;
  declare version: number;
}

@Module({})
class VersionRootModule {}

describe('DrizzleSqliteRepository version', () => {
  let app: INestApplicationContext;
  let shapes: RepositoryInterface<ShapeEntity>;

  const stored: Omit<ShapeEntity, 'id' | 'version'> = {
    data: { tags: ['a', 'b'] },
    done: true,
    // Stored to the second: equal once the database has it.
    seenAt: new Date('2026-01-02T03:04:05.400Z'),
    stampedAt: new Date('2026-01-02T03:04:05.400Z'),
    bytes: Buffer.from([1, 2, 3]),
    // Stored by numeric affinity as 1.5.
    amount: '1.50',
  };

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: VersionRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: () => {
              const db = drizzle(':memory:');
              db.run(sql`create table version_shape (
                id integer primary key autoincrement,
                data text not null,
                done integer not null,
                seenAt integer not null,
                stampedAt integer not null,
                bytes blob not null,
                amount numeric not null,
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
                    key: 'shape',
                    entity: ShapeEntity,
                    table: shapeTable,
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
    shapes = app.get(getDynamicRepositoryToken('shape'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps the version when every value equals the stored one, whatever its type', async () => {
    const created = await shapes.create(stored);

    const updated = await shapes.update(created, { id: created.id, ...stored });
    const replaced = await shapes.replace(created, {
      id: created.id,
      ...stored,
    });
    const upserted = await shapes.upsert({ id: created.id, ...stored });

    expect([updated.version, replaced.version, upserted.version]).toEqual([
      created.version,
      created.version,
      created.version,
    ]);
  });

  it.each<[string, Partial<ShapeEntity>]>([
    ['json', { data: { tags: ['a', 'c'] } }],
    ['boolean', { done: false }],
    ['timestamp', { seenAt: new Date('2026-01-02T03:04:06.000Z') }],
    [
      'millisecond timestamp',
      { stampedAt: new Date('2026-01-02T03:04:05.401Z') },
    ],
    ['blob', { bytes: Buffer.from([1, 2, 4]) }],
    ['numeric', { amount: '1.51' }],
  ])('moves the version when a %s value changes', async (_type, change) => {
    const created = await shapes.create(stored);

    const updated = await shapes.update(created, change);
    const upserted = await shapes.upsert({ ...updated, ...stored });

    expect([updated.version, upserted.version]).toEqual([
      created.version + 1,
      created.version + 2,
    ]);
  });
});

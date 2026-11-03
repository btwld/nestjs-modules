import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import {
  customType,
  doublePrecision,
  integer,
  json,
  numeric,
  pgSchema,
  pgTable,
  point,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
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

import { DrizzleRepositoryModule } from '../drizzle-repository.module.js';

/** Postgres compares two boxes by their area. */
const box = customType<{ data: string }>({
  dataType: () => 'box',
});

/** An enum outside the search path, named in mixed case. */
const mood = pgSchema('billing').enum('Mood', ['calm', 'busy']);

const shapeTable = pgTable('version_shape', {
  id: serial().primaryKey(),
  data: json().$type<{ tags: string[] }>().notNull(),
  at: point({ mode: 'xy' }).notNull(),
  bounds: box().notNull(),
  mood: mood().notNull(),
  amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  score: doublePrecision(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  seenAt: timestamp().notNull(),
  roundedAt: timestamp({ precision: 0 }).notNull(),
  version: integer().notNull(),
});

class ShapeEntity {
  declare id: number;
  declare data: { tags: string[] };
  declare at: { x: number; y: number };
  declare bounds: string;
  declare mood: 'calm' | 'busy';
  declare amount: number;
  declare score: number | null;
  declare price: string;
  declare seenAt: Date;
  declare roundedAt: Date;
  declare version: number;
}

@Module({})
class VersionRootModule {}

describe('DrizzleRepository version', () => {
  let app: INestApplicationContext;
  let shapes: RepositoryInterface<ShapeEntity>;

  const stored: Omit<ShapeEntity, 'id' | 'version'> = {
    data: { tags: ['a', 'b'] },
    at: { x: 1, y: 2 },
    bounds: '(0,0),(2,2)',
    mood: 'calm',
    amount: 1.5,
    score: null,
    // Stored as 1.50 and to the second: equal once the database has them.
    price: '1.5',
    seenAt: new Date('2026-01-02T03:04:05.000Z'),
    roundedAt: new Date('2026-01-02T03:04:05.400Z'),
  };

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: VersionRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({ client: new PGlite() });
              await db.execute(sql`create schema billing`);
              await db.execute(
                sql`create type billing."Mood" as enum ('calm', 'busy')`,
              );
              await db.execute(sql`create table version_shape (
                id serial primary key,
                data json not null,
                at point not null,
                bounds box not null,
                mood billing."Mood" not null,
                amount numeric(10, 2) not null,
                score double precision,
                price numeric(10, 2) not null,
                "seenAt" timestamp not null,
                "roundedAt" timestamp(0) not null,
                version integer not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzleRepositoryModule,
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

    // Each write names the serial key too, unchanged.
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
    ['point', { at: { x: 1, y: 3 } }],
    ['box of the same area', { bounds: '(0,0),(1,4)' }],
    ['enum', { mood: 'busy' }],
    ['NULL to NaN', { score: NaN }],
    ['timestamp', { seenAt: new Date('2026-01-02T03:04:06.000Z') }],
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

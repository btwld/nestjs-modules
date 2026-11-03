import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import {
  bigint,
  datetime,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';

import { type INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { DrizzleMysqlRepositoryModule } from '../drizzle-mysql-repository.module.js';

const URL =
  process.env.MYSQL_URL ?? 'mysql://root:mysql@localhost:53306/rockets_test';

/** A key the driver generates before the insert. */
const tokenTable = mysqlTable('mysql_token', {
  id: varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  label: varchar({ length: 64 }).notNull().unique(),
  version: int().notNull(),
});

/** A key the database generates, which MySQL cannot return. */
const ticketTable = mysqlTable('mysql_ticket', {
  id: varchar({ length: 36 }).primaryKey(),
  label: varchar({ length: 64 }).notNull(),
});

/** An unversioned table with a unique column besides its key. */
const labelTable = mysqlTable('mysql_label', {
  id: varchar({ length: 36 }).primaryKey(),
  label: varchar({ length: 64 }).notNull().unique(),
  extra: varchar({ length: 64 }).notNull(),
});

/** An auto-increment key read as a `bigint`. */
const bigTable = mysqlTable('mysql_big', {
  id: bigint({ mode: 'bigint' }).autoincrement().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
});

/** Columns MySQL rounds or normalizes on the way in. */
const shapeTable = mysqlTable('mysql_shape', {
  id: int().autoincrement().primaryKey(),
  data: json().$type<{ tags: string[] }>().notNull(),
  amount: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  price: decimal({ precision: 10, scale: 2 }).notNull(),
  mood: mysqlEnum(['calm', 'busy']).notNull(),
  roundedAt: datetime({ fsp: 0 }).notNull(),
  version: int().notNull(),
});

class TokenEntity {
  declare id: string;
  declare label: string;
  declare version: number;
}

class TicketEntity {
  declare id: string;
  declare label: string;
}

class LabelEntity {
  declare id: string;
  declare label: string;
  declare extra: string;
}

class BigEntity {
  declare id: bigint;
  declare name: string;
}

class ShapeEntity {
  declare id: number;
  declare data: { tags: string[] };
  declare amount: number;
  declare price: string;
  declare mood: 'calm' | 'busy';
  declare roundedAt: Date;
  declare version: number;
}

@Module({})
class MysqlRootModule {}

describe('DrizzleMysqlRepository', () => {
  let app: INestApplicationContext;
  let tokens: RepositoryInterface<TokenEntity>;
  let tickets: RepositoryInterface<TicketEntity>;
  let shapes: RepositoryInterface<ShapeEntity>;
  let labels: RepositoryInterface<LabelEntity>;
  let bigs: RepositoryInterface<BigEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: MysqlRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle(URL);
              await db.execute(
                sql`drop table if exists mysql_token, mysql_ticket, mysql_shape,
                  mysql_label, mysql_big`,
              );
              await db.execute(sql`create table mysql_label (
                id varchar(36) primary key,
                label varchar(64) not null unique,
                extra varchar(64) not null
              )`);
              await db.execute(sql`create table mysql_big (
                id bigint auto_increment primary key,
                name varchar(64) not null
              )`);
              await db.execute(sql`create table mysql_token (
                id varchar(36) primary key,
                label varchar(64) not null unique,
                version int not null
              )`);
              await db.execute(sql`create table mysql_ticket (
                id varchar(36) primary key default (uuid()),
                label varchar(64) not null
              )`);
              await db.execute(sql`create table mysql_shape (
                id int auto_increment primary key,
                data json not null,
                amount decimal(10, 2) not null,
                price decimal(10, 2) not null,
                mood enum('calm', 'busy') not null,
                roundedAt datetime(0) not null,
                version int not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzleMysqlRepositoryModule,
                entities: [
                  {
                    key: 'token',
                    entity: TokenEntity,
                    table: tokenTable,
                    version: 'version',
                  },
                  { key: 'ticket', entity: TicketEntity, table: ticketTable },
                  { key: 'label', entity: LabelEntity, table: labelTable },
                  { key: 'big', entity: BigEntity, table: bigTable },
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
    tokens = app.get(getDynamicRepositoryToken('token'));
    tickets = app.get(getDynamicRepositoryToken('ticket'));
    shapes = app.get(getDynamicRepositoryToken('shape'));
    labels = app.get(getDynamicRepositoryToken('label'));
    bigs = app.get(getDynamicRepositoryToken('big'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a $defaultFn key before the insert and returns the rows in order', async () => {
    const created = await tokens.createMany([
      { label: 'first' },
      { label: 'second' },
    ]);

    expect(created.map(({ label }) => label)).toEqual(['first', 'second']);
    expect(created.every(({ id }) => id.length === 36)).toBe(true);
    expect(await tokens.count()).toBe(2);
  });

  it('refuses to create a row whose key only the database generates', async () => {
    await expect(tickets.create({ label: 'x' })).rejects.toThrow(
      'is neither auto-increment nor generated by $defaultFn',
    );
    expect(await tickets.count()).toBe(0);
  });

  it('reports a versioned upsert that duplicates another unique column as the database error', async () => {
    await tokens.create({ id: 'taken', label: 'taken' });

    await expect(
      tokens.upsert({ id: 'other', label: 'taken' }),
    ).rejects.toThrow(RepositoryDatabaseException);
  });

  it('refuses an upsert whose new key duplicates another unique column, writing no other row', async () => {
    await labels.create({ id: 'a', label: 'L', extra: 'one' });

    await expect(
      labels.upsert({ id: 'b', label: 'L', extra: 'two' }),
    ).rejects.toThrow(RepositoryDatabaseException);
    expect(
      (await labels.find()).map(({ id, extra }) => ({ id, extra })),
    ).toEqual([{ id: 'a', extra: 'one' }]);
  });

  it('upserts an unversioned row by its key: inserts it, then updates it', async () => {
    const inserted = await labels.upsert({ id: 'u', label: 'U', extra: 'one' });
    const updated = await labels.upsert({ id: 'u', label: 'U', extra: 'two' });

    expect([inserted.extra, updated.extra]).toEqual(['one', 'two']);
    expect(await labels.count({ where: Where.eq('id', 'u') })).toBe(1);
  });

  it('upserts a stored row from several callers at once without deadlocking', async () => {
    await labels.create({ id: 'busy', label: 'B', extra: 'zero' });

    const results = await Promise.allSettled(
      ['one', 'two', 'three', 'four'].map((extra) =>
        labels.upsert({ id: 'busy', label: 'B', extra }),
      ),
    );

    expect(results.map(({ status }) => status)).toEqual([
      'fulfilled',
      'fulfilled',
      'fulfilled',
      'fulfilled',
    ]);
  });

  it('returns a row whose auto-increment key is read as a bigint', async () => {
    const [first, second] = await bigs.createMany([
      { name: 'first' },
      { name: 'second' },
    ]);

    expect(typeof first?.id).toBe('bigint');
    expect([first?.name, second?.name]).toEqual(['first', 'second']);
  });

  it('keeps the version when every value equals the stored one, whatever its type', async () => {
    const stored: Omit<ShapeEntity, 'id' | 'version'> = {
      data: { tags: ['a', 'b'] },
      amount: 1.5,
      // Stored as 1.50 and to the second: equal once the database has them.
      price: '1.5',
      mood: 'calm',
      roundedAt: new Date('2026-01-02T03:04:05.400Z'),
    };
    const created = await shapes.create(stored);

    const updated = await shapes.update(created, { id: created.id, ...stored });
    const upserted = await shapes.upsert({ id: created.id, ...stored });

    expect([updated.version, upserted.version]).toEqual([
      created.version,
      created.version,
    ]);
  });
});

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
import { DrizzleModule, getDrizzleToken } from '@nestjs/drizzle';

import { CoreModule } from '@concepta/nestjs-core';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type DrizzleMysqlClient } from '../drizzle-mysql.types.js';

import { type DrizzleMysqlAdapterModule } from './drizzle-mysql-adapter-module.type.js';

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

/** A versioned row Drizzle counts up on every update it builds. */
const touchedTable = mysqlTable('mysql_touched', {
  id: varchar({ length: 36 }).primaryKey(),
  label: varchar({ length: 64 }).notNull(),
  touched: int()
    .notNull()
    .default(0)
    .$onUpdate(() => sql`touched + 1`),
  version: int().notNull(),
});

/** A check across two columns, one of them with a default. */
const checkedTable = mysqlTable('mysql_checked', {
  id: varchar({ length: 36 }).primaryKey(),
  low: int().notNull(),
  high: int().notNull().default(0),
});

/** An auto-increment key read as a `bigint`. */
const bigTable = mysqlTable('mysql_big', {
  id: bigint({ mode: 'bigint' }).autoincrement().primaryKey(),
  name: varchar({ length: 64 }).notNull(),
});

/** An auto-increment key past 2^53, which the client returns as text. */
const hugeTable = mysqlTable('mysql_huge', {
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

class TouchedEntity {
  declare id: string;
  declare label: string;
  declare touched: number;
  declare version: number;
}

class CheckedEntity {
  declare id: string;
  declare low: number;
  declare high: number;
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

/**
 * What a MySQL-protocol adapter does beyond the conformance suite: how it
 * keys and reads back rows it inserts, upserts, and versions, on the
 * database at `url`.
 */
export function describeDrizzleMysqlRepository(
  name: string,
  driver: DrizzleMysqlAdapterModule,
  url: string,
): void {
  describe(name, () => {
    let app: INestApplicationContext;
    let tokens: RepositoryInterface<TokenEntity>;
    let tickets: RepositoryInterface<TicketEntity>;
    let shapes: RepositoryInterface<ShapeEntity>;
    let labels: RepositoryInterface<LabelEntity>;
    let bigs: RepositoryInterface<BigEntity>;
    let huges: RepositoryInterface<BigEntity>;
    let toucheds: RepositoryInterface<TouchedEntity>;
    let checkeds: RepositoryInterface<CheckedEntity>;

    beforeAll(async () => {
      app = await NestFactory.createApplicationContext(
        {
          module: MysqlRootModule,
          imports: [
            CoreModule.forRoot(),
            DrizzleModule.forRootAsync({
              useFactory: async () => {
                // Big integers as text, so keys past 2^53 read back exactly.
                const db = drizzle({
                  connection: {
                    uri: url,
                    supportBigNumbers: true,
                    bigNumberStrings: true,
                  },
                });
                await db.execute(
                  sql`drop table if exists mysql_token, mysql_ticket, mysql_shape,
                  mysql_label, mysql_big, mysql_huge, mysql_touched, mysql_checked`,
                );
                await db.execute(sql`create table mysql_touched (
                id varchar(36) primary key,
                label varchar(64) not null,
                touched int not null default 0,
                version int not null
              )`);
                await db.execute(sql`create table mysql_checked (
                id varchar(36) primary key,
                low int not null,
                high int not null default 0,
                check (low <= high)
              )`);
                await db.execute(sql`create table mysql_huge (
                id bigint auto_increment primary key,
                name varchar(64) not null
              ) auto_increment = 9007199254740993`);
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
                  driver,
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
                    { key: 'huge', entity: BigEntity, table: hugeTable },
                    {
                      key: 'touched',
                      entity: TouchedEntity,
                      table: touchedTable,
                      version: 'version',
                    },
                    {
                      key: 'checked',
                      entity: CheckedEntity,
                      table: checkedTable,
                    },
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
      huges = app.get(getDynamicRepositoryToken('huge'));
      toucheds = app.get(getDynamicRepositoryToken('touched'));
      checkeds = app.get(getDynamicRepositoryToken('checked'));
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

    it('stamps an $onUpdate column once for each upsert that changes the row, and never for one that does not', async () => {
      // Drizzle fills a left-out `$onUpdate` column on insert too.
      const inserted = await toucheds.upsert({
        id: 'n',
        label: 'a',
        touched: 0,
      });
      const same = await toucheds.upsert({ id: 'n', label: 'a' });
      const changed = await toucheds.upsert({ id: 'n', label: 'b' });

      expect([inserted, same, changed]).toEqual([
        { id: 'n', label: 'a', touched: 0, version: 1 },
        { id: 'n', label: 'a', touched: 0, version: 1 },
        { id: 'n', label: 'b', touched: 1, version: 2 },
      ]);
    });

    it('upserts a stored row from a payload of its key and some columns', async () => {
      await checkeds.create({ id: 'ck', low: 1, high: 10 });

      // Inserted alone, low 5 and the default high 0 break the check.
      expect(await checkeds.upsert({ id: 'ck', low: 5 })).toEqual({
        id: 'ck',
        low: 5,
        high: 10,
      });
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

    it('returns rows whose auto-increment key is past 2^53', async () => {
      const created = await huges.create({ name: 'one' });
      const many = await huges.createMany([{ name: 'two' }, { name: 'three' }]);

      expect([created, ...many].map(({ id, name }) => ({ id, name }))).toEqual([
        { id: BigInt('9007199254740993'), name: 'one' },
        { id: BigInt('9007199254740994'), name: 'two' },
        { id: BigInt('9007199254740995'), name: 'three' },
      ]);
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

      const updated = await shapes.update(created, {
        id: created.id,
        ...stored,
      });
      const upserted = await shapes.upsert({ id: created.id, ...stored });

      expect([updated.version, upserted.version]).toEqual([
        created.version,
        created.version,
      ]);
    });

    it('opens no transaction of its own for a write outside a run', async () => {
      const db: DrizzleMysqlClient = app.get(getDrizzleToken());
      const token = await tokens.create({ label: 'a' });
      const ticket = await tickets.create({ id: randomUUID(), label: 'a' });
      const transaction = vi.spyOn(db, 'transaction');

      try {
        const updated = await tokens.update(token, { label: 'b' });
        await tokens.update(
          updated,
          { label: 'c' },
          { expectedVersion: updated.version },
        );
        await tokens.upsert({ id: token.id, label: 'd' });
        await tickets.update(ticket, { label: 'b' });
        await bigs.createMany([{ name: 'x' }, { name: 'y' }]);

        expect(transaction).not.toHaveBeenCalled();
      } finally {
        transaction.mockRestore();
      }
    });
  });
}

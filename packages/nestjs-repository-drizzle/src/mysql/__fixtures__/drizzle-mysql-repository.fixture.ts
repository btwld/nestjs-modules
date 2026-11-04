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
  OptimisticLockException,
  RepositoryDatabaseException,
  RepositoryModule,
  type RepositoryInterface,
  TransactionScope,
  Where,
} from '@concepta/nestjs-repository';

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

/** A unique column besides the key, and a column Drizzle stamps on update. */
const stampTable = mysqlTable('mysql_stamp', {
  id: varchar({ length: 36 }).primaryKey(),
  label: varchar({ length: 64 }).notNull().unique(),
  touched: int()
    .notNull()
    .$onUpdate(() => 1),
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

class StampEntity {
  declare id: string;
  declare label: string;
  declare touched: number;
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
    let stamps: RepositoryInterface<StampEntity>;
    let toucheds: RepositoryInterface<TouchedEntity>;
    let checkeds: RepositoryInterface<CheckedEntity>;
    let txScope: TransactionScope;

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
                  mysql_label, mysql_big, mysql_huge, mysql_stamp, mysql_touched,
                  mysql_checked`,
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
                await db.execute(sql`create table mysql_stamp (
                id varchar(36) primary key,
                label varchar(64) not null unique,
                touched int not null
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
                    { key: 'stamp', entity: StampEntity, table: stampTable },
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
      stamps = app.get(getDynamicRepositoryToken('stamp'));
      toucheds = app.get(getDynamicRepositoryToken('touched'));
      checkeds = app.get(getDynamicRepositoryToken('checked'));
      txScope = app.get(TransactionScope);
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

    it('leaves the other row untouched when an upsert duplicates its unique column', async () => {
      await stamps.create({ id: 'a', label: 'L', touched: 0 });

      const run = txScope.run({}, async (txCtx) => {
        const refused = await stamps
          .upsert({ id: 'b', label: 'L', touched: 0 }, { ctx: txCtx })
          .catch((error: unknown) => error);
        return refused;
      });

      expect(await run).toBeInstanceOf(RepositoryDatabaseException);
      expect(await stamps.find()).toEqual([
        { id: 'a', label: 'L', touched: 0 },
      ]);
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

    it('upserts a stored row from a payload that could not be inserted alone', async () => {
      await checkeds.create({ id: 'ck', low: 1, high: 10 });

      // Inserted alone, low 5 and the default high 0 break the check.
      expect(await checkeds.upsert({ id: 'ck', low: 5 })).toEqual({
        id: 'ck',
        low: 5,
        high: 10,
      });
    });

    it('upserts an unversioned row by its key: inserts it, then updates it', async () => {
      const inserted = await labels.upsert({
        id: 'u',
        label: 'U',
        extra: 'one',
      });
      const updated = await labels.upsert({
        id: 'u',
        label: 'U',
        extra: 'two',
      });

      expect([inserted.extra, updated.extra]).toEqual(['one', 'two']);
      expect(await labels.count({ where: Where.eq('id', 'u') })).toBe(1);
    });

    it('upserts a stored row from a payload of its key and some columns', async () => {
      await labels.create({ id: 'partial', label: 'P', extra: 'one' });

      const partial = await labels.upsert({ id: 'partial', extra: 'two' });
      const keyOnly = await labels.upsert({ id: 'partial' });

      const stored = { id: 'partial', label: 'P', extra: 'two' };
      expect([partial, keyOnly]).toEqual([stored, stored]);
    });

    it.each([
      [
        'without',
        (id: string, caller: number): Promise<unknown> =>
          labels.upsert({ id, label: id, extra: `${caller}` }),
      ],
      [
        'with',
        (id: string): Promise<unknown> => tokens.upsert({ id, label: id }),
      ],
    ])(
      'upserts a new key from several callers at once %s a version, every one succeeding',
      async (versioning, upsert) => {
        const outcomes: string[] = [];
        for (let round = 0; round < 20; round++) {
          const id = `fresh-${versioning}-${round}`;
          const results = await Promise.allSettled(
            [0, 1, 2, 3].map((caller) => upsert(id, caller)),
          );
          outcomes.push(
            ...results.map((result) =>
              result.status === 'fulfilled'
                ? 'ok'
                : result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason),
            ),
          );
        }

        expect(outcomes.filter((outcome) => outcome !== 'ok')).toEqual([]);
      },
    );

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

    describe('in a transaction that has read before it writes', () => {
      it('refuses a versioned write another caller has committed past', async () => {
        const stored = await tokens.create({ id: 'stale', label: 'stale' });

        const write = (expectedVersion?: number) =>
          txScope.run({}, async (txCtx) => {
            const [mine] = await tokens.find({
              where: Where.eq('id', 'stale'),
              ctx: txCtx,
            });
            if (!mine) throw new Error('the row is gone');
            // Committed on another connection, after this run's first read.
            const theirs = await tokens.findOne({
              where: Where.eq('id', 'stale'),
            });
            if (!theirs) throw new Error('the row is gone');
            await tokens.update(theirs, { label: `theirs-${theirs.version}` });
            return tokens.update(
              mine,
              { label: 'mine' },
              { ctx: txCtx, expectedVersion },
            );
          });

        await expect(write()).rejects.toThrow(OptimisticLockException);
        await expect(write(stored.version)).rejects.toThrow(
          OptimisticLockException,
        );
        expect(
          await tokens.findOne({ where: Where.eq('id', 'stale') }),
        ).toEqual({ id: 'stale', label: 'theirs-2', version: 3 });
      });

      it('returns the row as stored, not as the run first read it', async () => {
        const stored = await labels.create({
          id: 'read-first',
          label: 'R',
          extra: 'same',
        });

        const written = await txScope.run({}, async (txCtx) => {
          await labels.find({ ctx: txCtx });
          await labels.update(stored, { label: 'R2' });
          return labels.update(stored, { extra: 'same' }, { ctx: txCtx });
        });

        expect(written).toEqual({
          id: 'read-first',
          label: 'R2',
          extra: 'same',
        });
      });
    });

    it('runs nothing more in a transaction a deadlock ended', async () => {
      const [a, b] = await labels.createMany([
        { id: 'dl-a', label: 'DA', extra: 'zero' },
        { id: 'dl-b', label: 'DB', extra: 'zero' },
      ]);
      if (!a || !b) throw new Error('the rows were not created');
      const victims: unknown[] = [];
      const afterDeadlock: unknown[] = [];
      let firstLocked = (): void => undefined;
      const bothLocked = Promise.all([
        new Promise<void>((resolve) => (firstLocked = resolve)),
        new Promise<void>((resolve) => setTimeout(resolve, 200)),
      ]);

      // Each run locks its own row, then the other's: one is the victim.
      const crossing = (own: LabelEntity, other: LabelEntity, name: string) =>
        txScope.run({}, async (txCtx) => {
          await labels.update(own, { extra: name }, { ctx: txCtx });
          if (name === 'first') firstLocked();
          await bothLocked;
          try {
            await labels.update(other, { extra: name }, { ctx: txCtx });
          } catch (error) {
            victims.push(error);
            afterDeadlock.push(
              await labels
                .create(
                  { id: `escaped-${name}`, label: name, extra: name },
                  { ctx: txCtx },
                )
                .catch((caught: unknown) => caught),
            );
          }
          return name;
        });

      const outcomes = await Promise.allSettled([
        crossing(a, b, 'first'),
        crossing(b, a, 'second'),
      ]);

      expect(victims).toEqual([expect.any(RepositoryDatabaseException)]);
      expect(afterDeadlock).toEqual([
        expect.objectContaining({
          message:
            'The database ended this transaction, so nothing more can run in it',
        }),
      ]);
      expect(outcomes.map(({ status }) => status).sort()).toEqual([
        'fulfilled',
        'rejected',
      ]);
      expect(
        await labels.count({ where: Where.starts('id', 'escaped-') }),
      ).toBe(0);
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
  });
}

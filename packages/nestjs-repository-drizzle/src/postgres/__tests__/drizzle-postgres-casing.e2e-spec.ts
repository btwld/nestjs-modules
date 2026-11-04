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
  Where,
} from '@concepta/nestjs-repository';

import { DrizzlePostgresRepositoryModule } from '../drizzle-postgres-repository.module.js';

/** Keys in camel case, columns in snake case: Drizzle's `casing`. */
const orderTable = pgTable('cased_order', {
  orderId: text().primaryKey(),
  fullName: text().notNull(),
  shipNote: text(),
  rowVersion: integer().notNull(),
});

class OrderEntity {
  declare orderId: string;
  declare fullName: string;
  declare shipNote: string | null;
  declare rowVersion: number;
}

@Module({})
class CasingRootModule {}

describe('DrizzlePostgresRepository on a database with snake_case casing', () => {
  let app: INestApplicationContext;
  let orders: RepositoryInterface<OrderEntity>;
  let versioned: RepositoryInterface<OrderEntity>;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      {
        module: CasingRootModule,
        imports: [
          CoreModule.forRoot(),
          DrizzleModule.forRootAsync({
            useFactory: async () => {
              const db = drizzle({
                client: new PGlite(),
                casing: 'snake_case',
              });
              await db.execute(sql`create table cased_order (
                order_id text primary key,
                full_name text not null,
                ship_note text,
                row_version integer not null
              )`);
              return { db };
            },
          }),
          DrizzleModule.forRootAsync({
            name: 'versioned',
            useFactory: async () => {
              const db = drizzle({
                client: new PGlite(),
                casing: 'snake_case',
              });
              await db.execute(sql`create table cased_order (
                order_id text primary key,
                full_name text not null,
                ship_note text,
                row_version integer not null
              )`);
              return { db };
            },
          }),
          RepositoryModule.forRoot({
            drivers: [
              {
                driver: DrizzlePostgresRepositoryModule,
                entities: [
                  { key: 'order', entity: OrderEntity, table: orderTable },
                  {
                    key: 'versioned-order',
                    entity: OrderEntity,
                    table: orderTable,
                    connection: 'versioned',
                    version: 'rowVersion',
                  },
                ],
              },
            ],
          }),
        ],
      },
      { abortOnError: false },
    );
    orders = app.get(getDynamicRepositoryToken('order'));
    versioned = app.get(getDynamicRepositoryToken('versioned-order'));
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    // Without a version column, the stored value stays as created.
    ['without', () => orders, 1],
    ['with', () => versioned, 2],
  ])(
    'upserts a stored row %s a version from a payload of its key and some columns',
    async (_, repository, rowVersion) => {
      const repo = repository();
      await repo.create({ orderId: 'o-1', fullName: 'Ann', rowVersion: 1 });

      const partial = await repo.upsert({ orderId: 'o-1', shipNote: 'door' });
      const keyOnly = await repo.upsert({ orderId: 'o-1' });

      const stored = {
        orderId: 'o-1',
        fullName: 'Ann',
        shipNote: 'door',
        rowVersion,
      };
      expect([partial, keyOnly]).toEqual([stored, stored]);
      expect(
        await repo.find({ where: Where.eq('fullName', 'Ann') }),
      ).toHaveLength(1);
    },
  );
});

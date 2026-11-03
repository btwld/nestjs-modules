import { sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import {
  type ConformanceAuthorInterface,
  type ConformanceAwardInterface,
  type ConformanceBookInterface,
  type ConformanceBookWithEagerAuthorInterface,
  type ConformanceItemInterface,
  type ConformancePlainItemInterface,
  type ConformanceTagInterface,
  type ConformanceTenantOrderInterface,
  type ConformanceTenantOrderLineInterface,
} from '@concepta/nestjs-repository/conformance';

import { type DrizzlePostgresClient } from '../drizzle-postgres.types.js';

// The conformance suite's fixtures as Drizzle tables.

export const itemTable = pgTable('conformance_item', {
  id: serial().primaryKey(),
  name: text().notNull(),
  rank: integer(),
  note: text(),
  removedAt: timestamp(),
  version: integer().notNull(),
});

export const plainItemTable = pgTable('conformance_plain_item', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const authorTable = pgTable('conformance_author', {
  id: text().primaryKey(),
  name: text().notNull(),
  removedAt: timestamp(),
});

export const awardTable = pgTable('conformance_award', {
  id: text().primaryKey(),
  name: text().notNull(),
  authorId: text(),
});

export const bookTable = pgTable('conformance_book', {
  id: text().primaryKey(),
  title: text().notNull(),
  authorId: text(),
  removedAt: timestamp(),
});

export const bookWithEagerAuthorTable = pgTable(
  'conformance_book_with_eager_author',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    authorId: text(),
    removedAt: timestamp(),
  },
);

export const tagTable = pgTable('conformance_tag', {
  id: text().primaryKey(),
  label: text().notNull(),
});

export const tenantOrderTable = pgTable('conformance_tenant_order', {
  id: text().primaryKey(),
  tenantId: text().notNull(),
  total: integer().notNull(),
});

export const tenantOrderLineTable = pgTable('conformance_tenant_order_line', {
  id: text().primaryKey(),
  tenantId: text().notNull(),
  orderId: text().notNull(),
  qty: integer().notNull(),
});

/** Every table, children before the rows they refer to. */
export const CONFORMANCE_TABLES = [
  tenantOrderLineTable,
  tenantOrderTable,
  awardTable,
  bookTable,
  bookWithEagerAuthorTable,
  tagTable,
  authorTable,
  itemTable,
  plainItemTable,
];

/**
 * Create the fixture tables. The implementer owns its schema, so the
 * harness writes its own.
 */
export async function createConformanceSchema(
  db: DrizzlePostgresClient,
): Promise<void> {
  const statements = [
    sql`create table conformance_item (
      id serial primary key,
      name text not null,
      rank integer,
      note text,
      "removedAt" timestamp,
      version integer not null
    )`,
    sql`create table conformance_plain_item (
      id serial primary key,
      name text not null
    )`,
    sql`create table conformance_author (
      id text primary key,
      name text not null,
      "removedAt" timestamp
    )`,
    sql`create table conformance_award (
      id text primary key,
      name text not null,
      "authorId" text references conformance_author (id)
    )`,
    sql`create table conformance_book (
      id text primary key,
      title text not null,
      "authorId" text references conformance_author (id),
      "removedAt" timestamp
    )`,
    sql`create table conformance_book_with_eager_author (
      id text primary key,
      title text not null,
      "authorId" text references conformance_author (id),
      "removedAt" timestamp
    )`,
    sql`create table conformance_tag (
      id text primary key,
      label text not null
    )`,
    sql`create table conformance_tenant_order (
      id text primary key,
      "tenantId" text not null,
      total integer not null,
      unique ("tenantId", id)
    )`,
    sql`create table conformance_tenant_order_line (
      id text primary key,
      "tenantId" text not null,
      "orderId" text not null,
      qty integer not null,
      foreign key ("tenantId", "orderId")
        references conformance_tenant_order ("tenantId", id)
    )`,
  ];
  for (const statement of statements) {
    await db.execute(statement);
  }
}

export class ConformanceItemEntity implements ConformanceItemInterface {
  declare id: number;
  declare name: string;
  declare rank: number | null;
  declare note: string | null;
  declare removedAt: Date | null;
  declare version: number;
}

export class ConformancePlainItemEntity implements ConformancePlainItemInterface {
  declare id: number;
  declare name: string;
}

export class ConformanceAuthorEntity implements ConformanceAuthorInterface {
  declare id: string;
  declare name: string;
  declare removedAt: Date | null;
}

export class ConformanceAwardEntity implements ConformanceAwardInterface {
  declare id: string;
  declare name: string;
  declare authorId: string | null;
}

export class ConformanceBookEntity implements ConformanceBookInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}

export class ConformanceBookWithEagerAuthorEntity implements ConformanceBookWithEagerAuthorInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}

export class ConformanceTagEntity implements ConformanceTagInterface {
  declare id: string;
  declare label: string;
}

export class ConformanceTenantOrderEntity implements ConformanceTenantOrderInterface {
  declare id: string;
  declare tenantId: string;
  declare total: number;
}

export class ConformanceTenantOrderLineEntity implements ConformanceTenantOrderLineInterface {
  declare id: string;
  declare tenantId: string;
  declare orderId: string;
  declare qty: number;
}

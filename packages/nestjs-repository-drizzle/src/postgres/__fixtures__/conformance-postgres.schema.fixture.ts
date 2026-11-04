import { sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { type DrizzlePostgresClient } from '../drizzle-postgres.types.js';

// The conformance suite's fixtures as Drizzle tables.

export const itemTable = pgTable('drizzle_conformance_item', {
  id: serial().primaryKey(),
  name: text().notNull(),
  rank: integer(),
  note: text(),
  removedAt: timestamp(),
  version: integer().notNull(),
});

export const plainItemTable = pgTable('drizzle_conformance_plain_item', {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const uniqueItemTable = pgTable('drizzle_conformance_unique_item', {
  id: text().primaryKey(),
  code: text().notNull().unique(),
  name: text().notNull(),
  version: integer().notNull(),
});

export const authorTable = pgTable('drizzle_conformance_author', {
  id: text().primaryKey(),
  name: text().notNull(),
  removedAt: timestamp(),
});

export const awardTable = pgTable('drizzle_conformance_award', {
  id: text().primaryKey(),
  name: text().notNull(),
  authorId: text(),
});

export const bookTable = pgTable('drizzle_conformance_book', {
  id: text().primaryKey(),
  title: text().notNull(),
  authorId: text(),
  removedAt: timestamp(),
});

export const bookWithEagerAuthorTable = pgTable(
  'drizzle_conformance_book_with_eager_author',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    authorId: text(),
    removedAt: timestamp(),
  },
);

export const tagTable = pgTable('drizzle_conformance_tag', {
  id: text().primaryKey(),
  label: text().notNull(),
});

export const tenantOrderTable = pgTable('drizzle_conformance_tenant_order', {
  id: text().primaryKey(),
  tenantId: text().notNull(),
  total: integer().notNull(),
});

export const tenantOrderLineTable = pgTable(
  'drizzle_conformance_tenant_order_line',
  {
    id: text().primaryKey(),
    tenantId: text().notNull(),
    orderId: text().notNull(),
    qty: integer().notNull(),
  },
);

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
  uniqueItemTable,
];

/**
 * Create the fixture tables afresh. The implementer owns its schema, so the
 * harness writes its own.
 */
export async function createConformanceSchema(
  db: DrizzlePostgresClient,
): Promise<void> {
  const statements = [
    sql`drop table if exists drizzle_conformance_tenant_order_line,
      drizzle_conformance_tenant_order, drizzle_conformance_award, drizzle_conformance_book,
      drizzle_conformance_book_with_eager_author, drizzle_conformance_tag,
      drizzle_conformance_author, drizzle_conformance_item, drizzle_conformance_plain_item,
      drizzle_conformance_unique_item`,
    sql`create table drizzle_conformance_item (
      id serial primary key,
      name text not null,
      rank integer,
      note text,
      "removedAt" timestamp,
      version integer not null
    )`,
    sql`create table drizzle_conformance_plain_item (
      id serial primary key,
      name text not null
    )`,
    sql`create table drizzle_conformance_unique_item (
      id text primary key,
      code text not null unique,
      name text not null,
      version integer not null
    )`,
    sql`create table drizzle_conformance_author (
      id text primary key,
      name text not null,
      "removedAt" timestamp
    )`,
    sql`create table drizzle_conformance_award (
      id text primary key,
      name text not null,
      "authorId" text references drizzle_conformance_author (id)
    )`,
    sql`create table drizzle_conformance_book (
      id text primary key,
      title text not null,
      "authorId" text references drizzle_conformance_author (id),
      "removedAt" timestamp
    )`,
    sql`create table drizzle_conformance_book_with_eager_author (
      id text primary key,
      title text not null,
      "authorId" text references drizzle_conformance_author (id),
      "removedAt" timestamp
    )`,
    sql`create table drizzle_conformance_tag (
      id text primary key,
      label text not null
    )`,
    sql`create table drizzle_conformance_tenant_order (
      id text primary key,
      "tenantId" text not null,
      total integer not null,
      unique ("tenantId", id)
    )`,
    sql`create table drizzle_conformance_tenant_order_line (
      id text primary key,
      "tenantId" text not null,
      "orderId" text not null,
      qty integer not null,
      foreign key ("tenantId", "orderId")
        references drizzle_conformance_tenant_order ("tenantId", id)
    )`,
  ];
  for (const statement of statements) {
    await db.execute(statement);
  }
}

import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { type DrizzleSqliteClient } from '../drizzle-sqlite.types.js';

// The conformance suite's fixtures as Drizzle SQLite tables.

const removedAt = () => integer({ mode: 'timestamp_ms' });

export const itemTable = sqliteTable('drizzle_conformance_item', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  rank: integer(),
  note: text(),
  removedAt: removedAt(),
  version: integer().notNull(),
});

export const plainItemTable = sqliteTable('drizzle_conformance_plain_item', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const uniqueItemTable = sqliteTable('drizzle_conformance_unique_item', {
  id: text().primaryKey(),
  code: text().notNull().unique(),
  name: text().notNull(),
  version: integer().notNull(),
});

export const authorTable = sqliteTable('drizzle_conformance_author', {
  id: text().primaryKey(),
  name: text().notNull(),
  removedAt: removedAt(),
});

export const awardTable = sqliteTable('drizzle_conformance_award', {
  id: text().primaryKey(),
  name: text().notNull(),
  authorId: text(),
});

export const bookTable = sqliteTable('drizzle_conformance_book', {
  id: text().primaryKey(),
  title: text().notNull(),
  authorId: text(),
  removedAt: removedAt(),
});

export const bookWithEagerAuthorTable = sqliteTable(
  'drizzle_conformance_book_with_eager_author',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    authorId: text(),
    removedAt: removedAt(),
  },
);

export const tagTable = sqliteTable('drizzle_conformance_tag', {
  id: text().primaryKey(),
  label: text().notNull(),
});

export const tenantOrderTable = sqliteTable(
  'drizzle_conformance_tenant_order',
  {
    id: text().primaryKey(),
    tenantId: text().notNull(),
    total: integer().notNull(),
  },
);

export const tenantOrderLineTable = sqliteTable(
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
 * Create the fixture tables, and enforce foreign keys, which SQLite leaves
 * off unless a connection turns them on. The implementer owns its schema,
 * so the harness writes its own.
 */
export function createConformanceSchema(db: DrizzleSqliteClient): void {
  const statements = [
    sql`pragma foreign_keys = on`,
    sql`create table drizzle_conformance_item (
      id integer primary key autoincrement,
      name text not null,
      rank integer,
      note text,
      removedAt integer,
      version integer not null
    )`,
    sql`create table drizzle_conformance_plain_item (
      id integer primary key autoincrement,
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
      removedAt integer
    )`,
    sql`create table drizzle_conformance_award (
      id text primary key,
      name text not null,
      authorId text references drizzle_conformance_author (id)
    )`,
    sql`create table drizzle_conformance_book (
      id text primary key,
      title text not null,
      authorId text references drizzle_conformance_author (id),
      removedAt integer
    )`,
    sql`create table drizzle_conformance_book_with_eager_author (
      id text primary key,
      title text not null,
      authorId text references drizzle_conformance_author (id),
      removedAt integer
    )`,
    sql`create table drizzle_conformance_tag (
      id text primary key,
      label text not null
    )`,
    sql`create table drizzle_conformance_tenant_order (
      id text primary key,
      tenantId text not null,
      total integer not null,
      unique (tenantId, id)
    )`,
    sql`create table drizzle_conformance_tenant_order_line (
      id text primary key,
      tenantId text not null,
      orderId text not null,
      qty integer not null,
      foreign key (tenantId, orderId)
        references drizzle_conformance_tenant_order (tenantId, id)
    )`,
  ];
  for (const statement of statements) {
    db.run(statement);
  }
}

import { sql } from 'drizzle-orm';
import {
  datetime,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';

import { type DrizzleMysqlClient } from '../drizzle-mysql.types.js';

// The conformance suite's fixtures as Drizzle MySQL tables.

const key = () => varchar({ length: 64 });
const removedAt = () => datetime({ fsp: 3 });

export const itemTable = mysqlTable('conformance_item', {
  id: int().autoincrement().primaryKey(),
  name: text().notNull(),
  rank: int(),
  note: text(),
  removedAt: removedAt(),
  version: int().notNull(),
});

export const plainItemTable = mysqlTable('conformance_plain_item', {
  id: int().autoincrement().primaryKey(),
  name: text().notNull(),
});

export const authorTable = mysqlTable('conformance_author', {
  id: key().primaryKey(),
  name: text().notNull(),
  removedAt: removedAt(),
});

export const awardTable = mysqlTable('conformance_award', {
  id: key().primaryKey(),
  name: text().notNull(),
  authorId: key(),
});

export const bookTable = mysqlTable('conformance_book', {
  id: key().primaryKey(),
  title: text().notNull(),
  authorId: key(),
  removedAt: removedAt(),
});

export const bookWithEagerAuthorTable = mysqlTable(
  'conformance_book_with_eager_author',
  {
    id: key().primaryKey(),
    title: text().notNull(),
    authorId: key(),
    removedAt: removedAt(),
  },
);

export const tagTable = mysqlTable('conformance_tag', {
  id: key().primaryKey(),
  label: text().notNull(),
});

export const tenantOrderTable = mysqlTable('conformance_tenant_order', {
  id: key().primaryKey(),
  tenantId: key().notNull(),
  total: int().notNull(),
});

export const tenantOrderLineTable = mysqlTable(
  'conformance_tenant_order_line',
  {
    id: key().primaryKey(),
    tenantId: key().notNull(),
    orderId: key().notNull(),
    qty: int().notNull(),
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
];

/**
 * Create the fixture tables afresh. The implementer owns its schema, so the
 * harness writes its own.
 */
export async function createConformanceSchema(
  db: DrizzleMysqlClient,
): Promise<void> {
  const statements = [
    sql`drop table if exists conformance_tenant_order_line,
      conformance_tenant_order, conformance_award, conformance_book,
      conformance_book_with_eager_author, conformance_tag,
      conformance_author, conformance_item, conformance_plain_item`,
    sql`create table conformance_item (
      id int auto_increment primary key,
      name text not null,
      \`rank\` int,
      note text,
      removedAt datetime(3),
      version int not null
    )`,
    sql`create table conformance_plain_item (
      id int auto_increment primary key,
      name text not null
    )`,
    sql`create table conformance_author (
      id varchar(64) primary key,
      name text not null,
      removedAt datetime(3)
    )`,
    sql`create table conformance_award (
      id varchar(64) primary key,
      name text not null,
      authorId varchar(64) references conformance_author (id)
    )`,
    sql`create table conformance_book (
      id varchar(64) primary key,
      title text not null,
      authorId varchar(64),
      removedAt datetime(3),
      foreign key (authorId) references conformance_author (id)
    )`,
    sql`create table conformance_book_with_eager_author (
      id varchar(64) primary key,
      title text not null,
      authorId varchar(64),
      removedAt datetime(3),
      foreign key (authorId) references conformance_author (id)
    )`,
    sql`create table conformance_tag (
      id varchar(64) primary key,
      label text not null
    )`,
    sql`create table conformance_tenant_order (
      id varchar(64) primary key,
      tenantId varchar(64) not null,
      total int not null,
      unique (tenantId, id)
    )`,
    sql`create table conformance_tenant_order_line (
      id varchar(64) primary key,
      tenantId varchar(64) not null,
      orderId varchar(64) not null,
      qty int not null,
      foreign key (tenantId, orderId)
        references conformance_tenant_order (tenantId, id)
    )`,
  ];
  for (const statement of statements) {
    await db.execute(statement);
  }
}

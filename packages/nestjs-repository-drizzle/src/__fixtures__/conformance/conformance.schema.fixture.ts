import { defineRelations, sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import {
  type ConformanceAuthorInterface,
  type ConformanceBookInterface,
  type ConformanceBookWithEagerAuthorInterface,
  type ConformanceItemInterface,
  type ConformancePlainItemInterface,
  type ConformanceTagInterface,
  type ConformanceTenantOrderInterface,
  type ConformanceTenantOrderLineInterface,
} from '@concepta/nestjs-repository/conformance';

import { type DrizzleClient } from '../../drizzle-repository.types.js';

/** The conformance suite's fixtures as Drizzle tables. */

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

export const bookTagTable = pgTable('conformance_book_tag', {
  bookId: text().notNull(),
  tagId: text().notNull(),
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

const schema = {
  item: itemTable,
  plainItem: plainItemTable,
  author: authorTable,
  book: bookTable,
  bookWithEagerAuthor: bookWithEagerAuthorTable,
  tag: tagTable,
  bookTag: bookTagTable,
  tenantOrder: tenantOrderTable,
  tenantOrderLine: tenantOrderLineTable,
};

export const conformanceRelations = defineRelations(schema, (r) => ({
  author: {
    books: r.many.book(),
  },
  book: {
    author: r.one.author({ from: r.book.authorId, to: r.author.id }),
    tags: r.many.tag({
      from: r.book.id.through(r.bookTag.bookId),
      to: r.tag.id.through(r.bookTag.tagId),
    }),
  },
  bookWithEagerAuthor: {
    author: r.one.author({
      from: r.bookWithEagerAuthor.authorId,
      to: r.author.id,
    }),
  },
  tag: {
    books: r.many.book(),
  },
  tenantOrder: {
    lines: r.many.tenantOrderLine(),
  },
  tenantOrderLine: {
    order: r.one.tenantOrder({
      from: [r.tenantOrderLine.tenantId, r.tenantOrderLine.orderId],
      to: [r.tenantOrder.tenantId, r.tenantOrder.id],
    }),
  },
}));

/** Every table, children before the rows they refer to. */
export const CONFORMANCE_TABLES = [
  bookTagTable,
  tenantOrderLineTable,
  tenantOrderTable,
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
  db: DrizzleClient,
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
    sql`create table conformance_book_tag (
      "bookId" text not null references conformance_book (id),
      "tagId" text not null references conformance_tag (id),
      primary key ("bookId", "tagId")
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
  declare books?: ConformanceBookEntity[];
}

export class ConformanceBookEntity implements ConformanceBookInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
  declare author?: ConformanceAuthorEntity | null;
  declare tags?: ConformanceTagEntity[];
}

export class ConformanceBookWithEagerAuthorEntity implements ConformanceBookWithEagerAuthorInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
  declare author?: ConformanceAuthorEntity | null;
}

export class ConformanceTagEntity implements ConformanceTagInterface {
  declare id: string;
  declare label: string;
  declare books?: ConformanceBookEntity[];
}

export class ConformanceTenantOrderEntity implements ConformanceTenantOrderInterface {
  declare id: string;
  declare tenantId: string;
  declare total: number;
  declare lines?: ConformanceTenantOrderLineEntity[];
}

export class ConformanceTenantOrderLineEntity implements ConformanceTenantOrderLineInterface {
  declare id: string;
  declare tenantId: string;
  declare orderId: string;
  declare qty: number;
  declare order?: ConformanceTenantOrderEntity | null;
}

import {
  mysqlTable,
  primaryKey as mysqlPrimaryKey,
  varchar,
  mysqlSchema,
} from 'drizzle-orm/mysql-core';
import { pgSchema, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';

import { buildColumns, buildUrn } from '../drizzle-metadata.js';

describe('drizzle metadata', () => {
  describe('buildUrn', () => {
    it.each([
      ['a Postgres table', pgTable('t', { id: text() }), 'urn:drizzle:c:t'],
      [
        'a Postgres table in a schema',
        pgSchema('billing').table('t', { id: text() }),
        'urn:drizzle:c:billing.t',
      ],
      [
        'a MySQL table',
        mysqlTable('t', { id: varchar({ length: 9 }) }),
        'urn:drizzle:c:t',
      ],
      [
        'a MySQL table in a database',
        mysqlSchema('shop').table('t', { id: varchar({ length: 9 }) }),
        'urn:drizzle:c:shop.t',
      ],
      [
        'a SQLite table',
        sqliteTable('t', { id: sqliteText() }),
        'urn:drizzle:c:t',
      ],
    ])('names %s by its schema only when it has one', (_, table, urn) => {
      expect(buildUrn(table, 'c')).toBe(urn);
    });
  });

  describe('buildColumns', () => {
    it('reports a primary key declared in a MySQL table config', () => {
      const table = mysqlTable(
        'pk_config',
        {
          id: varchar({ length: 64 }).notNull(),
          name: varchar({ length: 64 }).notNull(),
        },
        (t) => [mysqlPrimaryKey({ columns: [t.id] })],
      );

      expect(
        buildColumns(table, {}).map(({ name, isPrimary }) => ({
          name,
          isPrimary,
        })),
      ).toEqual([
        { name: 'id', isPrimary: true },
        { name: 'name', isPrimary: false },
      ]);
    });

    it('reports a primary key declared in the table config', () => {
      const table = pgTable(
        'pk_config',
        { id: text().notNull(), name: text().notNull() },
        (t) => [primaryKey({ columns: [t.id] })],
      );

      expect(buildColumns(table, {})).toEqual([
        { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
        {
          name: 'name',
          isPrimary: false,
          isRemoveDate: false,
          isVersion: false,
        },
      ]);
    });

    it('reports every column of a composite primary key declared in the table config', () => {
      const table = pgTable(
        'pk_composite',
        { a: text().notNull(), b: text().notNull() },
        (t) => [primaryKey({ columns: [t.a, t.b] })],
      );

      expect(
        buildColumns(table, {}).map(({ name, isPrimary }) => ({
          name,
          isPrimary,
        })),
      ).toEqual([
        { name: 'a', isPrimary: true },
        { name: 'b', isPrimary: true },
      ]);
    });
  });
});

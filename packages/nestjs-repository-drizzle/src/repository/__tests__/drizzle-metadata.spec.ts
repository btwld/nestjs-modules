import {
  mysqlTable,
  primaryKey as mysqlPrimaryKey,
  varchar,
} from 'drizzle-orm/mysql-core';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import { buildColumns } from '../drizzle-metadata.js';

describe('drizzle metadata', () => {
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

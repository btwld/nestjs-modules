import { defineRelations } from 'drizzle-orm';
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import {
  buildColumns,
  buildRelations,
} from '../repository/drizzle-metadata.js';

class OrgEntity {}
class GroupEntity {}

describe('drizzle metadata', () => {
  describe('buildColumns', () => {
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

  describe('buildRelations', () => {
    const org = pgTable('org', {
      id: text().primaryKey(),
      tenantId: text().notNull(),
    });
    const group = pgTable('grp', {
      id: text().primaryKey(),
      tenantId: text().notNull(),
    });
    const orgGroup = pgTable('org_grp', {
      tenantId: text().notNull(),
      orgId: text().notNull(),
      groupId: text().notNull(),
    });
    const registered = [
      { key: 'org', entity: OrgEntity, table: org },
      { key: 'group', entity: GroupEntity, table: group },
    ];

    it('refuses a many-to-many relation matched on more than one junction column', () => {
      const relations = defineRelations({ org, group, orgGroup }, (r) => ({
        org: {
          groups: r.many.group({
            from: [
              r.org.tenantId.through(r.orgGroup.tenantId),
              r.org.id.through(r.orgGroup.orgId),
            ],
            to: [
              r.group.tenantId.through(r.orgGroup.tenantId),
              r.group.id.through(r.orgGroup.groupId),
            ],
          }),
        },
      }));

      expect(() =>
        buildRelations(org, relations, registered, 'default'),
      ).toThrow('Cannot map relation "groups" of table "org"');
    });

    it('reports a many-to-many relation matched on one junction column', () => {
      const relations = defineRelations({ org, group, orgGroup }, (r) => ({
        org: {
          groups: r.many.group({
            from: r.org.id.through(r.orgGroup.orgId),
            to: r.group.id.through(r.orgGroup.groupId),
          }),
        },
      }));

      const [groups] = buildRelations(org, relations, registered, 'default');

      expect(groups?.metadata.on).toEqual({ from: 'id', to: 'id' });
      expect(groups?.metadata.through).toEqual({
        urn: 'urn:drizzle:default:org_grp',
        fromKey: 'orgId',
        toKey: 'groupId',
      });
    });
  });
});

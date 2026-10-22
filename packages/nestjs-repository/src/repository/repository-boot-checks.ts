import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryAdapter } from './repository-adapter.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * Whether `name` is defined by a getter or setter anywhere on the class's
 * prototype chain.
 */
function isAccessor(type: PlainLiteralObject, name: string): boolean {
  let prototype: unknown = Reflect.get(type, 'prototype');

  while (prototype !== null && prototype !== Object.prototype) {
    if (typeof prototype !== 'object' && typeof prototype !== 'function') {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor) return Boolean(descriptor.get || descriptor.set);
    prototype = Object.getPrototypeOf(prototype);
  }

  return false;
}

/**
 * Check that no primary or foreign key column is backed by a getter or setter
 * on the entity class.
 *
 * The repository's checks read a key as the value it was given, but a driver
 * building the entity runs the class's setters. A setter that rewrites a key,
 * such as one lowercasing an email, makes the two name different rows: the
 * create guard looks up one key while the driver overwrites another, or a
 * row-scope resolver checks one parent while the driver links another.
 */
export function checkNoAccessorKeys(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    const { type, columns, relations = [] } = adapter.metadata;
    const keys = new Set<string>([
      ...columns.filter((column) => column.isPrimary).map(({ name }) => name),
      ...relations.flatMap(({ foreignKey = [] }) =>
        foreignKey.map(({ from }) => from),
      ),
    ]);

    return [...keys]
      .filter((key) => isAccessor(type, key))
      .map(
        (key) =>
          `"${adapter.entityKey}" key column "${key}" is a getter or setter ` +
          `on ${type.name}. Keys are read and written as plain properties; ` +
          `make "${key}" one.`,
      );
  });
}

/**
 * Check that no reported column carries a relation's name.
 *
 * A column is a value of the entity's own row; a relation names rows of
 * another entity. Reporting one name as both would let a read select it, or a
 * write set it, as though the related rows were this entity's own data.
 */
export function checkColumnsAreNotRelations(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    const { columns, relations = [] } = adapter.metadata;
    const columnNames = new Set(columns.map(({ name }) => name));

    return relations
      .filter(({ name }) => columnNames.has(name))
      .map(
        ({ name }) =>
          `"${adapter.entityKey}" relation "${name}" is also reported as a ` +
          `column. The repository driver must report a relation only as a ` +
          `relation.`,
      );
  });
}

/**
 * Check that every foreign key has a column of its own.
 *
 * A write sets an entity's own columns and refuses relations, so a foreign
 * key held only by its relation property could never be set.
 */
export function checkForeignKeyColumns(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    const { columns, relations = [] } = adapter.metadata;
    const columnNames = new Set(columns.map(({ name }) => name));

    return relations
      .filter(({ foreignKey = [] }) =>
        foreignKey.some(({ from }) => !columnNames.has(from)),
      )
      .map(
        ({ name }) =>
          `"${adapter.entityKey}" relation "${name}" has no column of its own ` +
          `for its foreign key, so it can never be written. Declare the ` +
          `foreign key as a column.`,
      );
  });
}

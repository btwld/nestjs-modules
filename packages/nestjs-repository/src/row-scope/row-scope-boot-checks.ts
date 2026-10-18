import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryMetadataInterface } from '../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';

import { isRowScopeScoped } from './interfaces/row-scope-registration.interface.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * Check that no entity without a row scope has a relation to one with a row
 * scope.
 *
 * Reading such a relation would return related rows the caller is not allowed
 * to see: the related entity's resolver never sees a relation read through
 * another entity. Between two scoped entities the relation is allowed, but no
 * read can join it, so its rows are only ever read through their own
 * repository.
 *
 * Rows are matched by URN, not entity name, so this also covers a relation
 * into rows a scoped entity reads under another name, and a many-to-many whose
 * junction is scoped. A federated relation is exempt: it is read through the
 * related entity's own repository, under its row scope.
 */
export function checkRelationsIntoScoped(adapters: AnyAdapter[]): string[] {
  const scopedUrns = scopedKeysByUrn(adapters);

  return adapters
    .filter((adapter) => !isRowScopeScoped(adapter.rowScopeDeclaration))
    .flatMap((adapter) =>
      (adapter.metadata.relations ?? [])
        .filter(({ name }) => !adapter.federatedRelations.has(name))
        .flatMap(({ name, targetEntity, targetUrn, through }) => {
          if (scopedUrns.has(targetUrn)) {
            return [
              `"${adapter.entityKey}" has no row scope, but its "${name}" ` +
                `relation points at ${targetEntity}, which does. Reading ` +
                `"${name}" would return ${targetEntity} rows the caller is ` +
                `not allowed to see. Give "${adapter.entityKey}" a row scope ` +
                `in forRoot(), or remove "${name}" from the entity and ` +
                `declare the relation on ${targetEntity}'s side only.`,
            ];
          }
          const junctionKey = through && scopedUrns.get(through.urn);
          if (junctionKey) {
            return [
              `"${adapter.entityKey}" has no row scope, but its "${name}" ` +
                `relation reads through the rows of "${junctionKey}", which ` +
                `has one. Reading "${name}" would follow links the caller is ` +
                `not allowed to see. Give "${adapter.entityKey}" a row scope ` +
                `in forRoot(), or remove "${name}" from the entity.`,
            ];
          }
          return [];
        }),
    );
}

/**
 * The relations in `metadata` whose rows, or whose junction rows, are among
 * `scopedUrns`.
 */
export function findRelationsIntoScoped(
  metadata: RepositoryMetadataInterface<PlainLiteralObject>,
  scopedUrns: ReadonlySet<string>,
): string[] {
  return (metadata.relations ?? [])
    .filter(
      ({ targetUrn, through }) =>
        scopedUrns.has(targetUrn) ||
        (through !== undefined && scopedUrns.has(through.urn)),
    )
    .map(({ name }) => name);
}

/**
 * Check that no entity allowing eager relations has a relation into rows with
 * a row scope. An eager relation is loaded on every read, as a join no read
 * asked for, so it would bypass that row scope.
 */
export function checkEagerRelationsIntoScoped(
  adapters: AnyAdapter[],
): string[] {
  return adapters
    .filter(
      (adapter) =>
        adapter.allowsEagerRelations && adapter.relationsIntoScoped.length > 0,
    )
    .map((adapter) => {
      const targets = new Map(
        (adapter.metadata.relations ?? []).map(({ name, targetEntity }) => [
          name,
          targetEntity,
        ]),
      );
      const relations = adapter.relationsIntoScoped
        .map((name) => `"${name}" (${targets.get(name)} rows)`)
        .join(', ');

      return (
        `"${adapter.entityKey}" allows eager relations, but ${relations} ` +
        'reach rows with a row scope, which an eager relation would bypass ' +
        `on every read. Remove allowEagerRelations from ` +
        `"${adapter.entityKey}" in forRoot().`
      );
    });
}

/** Each scoped URN, with the key of the entity scoping it. */
function scopedKeysByUrn(adapters: AnyAdapter[]): Map<string, string> {
  return new Map(
    adapters
      .filter((adapter) => isRowScopeScoped(adapter.rowScopeDeclaration))
      .map((adapter) => [adapter.metadata.urn, adapter.entityKey]),
  );
}

/**
 * Check that every registered entity carries a declaration.
 *
 * Opt-in per deployment, deliberately: whether an undeclared entity is a
 * mistake is a property of the deployment, not of the framework. An
 * application that scopes everything wants this on; one that uses row scope
 * for a handful of entities among many does not. The default stays
 * non-breaking for anyone already registering entities.
 */
export function checkDeclarationCompleteness(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    if (adapter.rowScopeDeclaration) return [];

    return [
      `"${adapter.entityKey}" has no row scope declaration, and this ` +
        'deployment requires one. Declare it scoped, or declare it public ' +
        'with a reason.',
    ];
  });
}

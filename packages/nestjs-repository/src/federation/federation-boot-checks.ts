import { type PlainLiteralObject } from '@nestjs/common';

import { type RelationConfig } from '../interfaces/repository-provider-options.interface.js';
import { type RepositoryMetadataInterface } from '../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';
import { type RepositoryRegistryService } from '../services/repository-registry.service.js';

import { type FederatedRelation } from './federation-reader.service.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * An entity's federated relations, from its `forRoot()` `relations` entry,
 * with a message for each setting that names nothing it can apply to.
 */
export function federatedRelationsOf(
  entityKey: string,
  metadata: RepositoryMetadataInterface<PlainLiteralObject>,
  config: Readonly<Record<string, RelationConfig>> = {},
): { relations: Map<string, FederatedRelation>; failures: string[] } {
  const relations = new Map<string, FederatedRelation>();
  const failures: string[] = [];

  for (const [name, { federated, distinctFilter }] of Object.entries(config)) {
    const relation = metadata.relations?.find((each) => each.name === name);
    if (!relation) {
      failures.push(
        `"${entityKey}" configures relations.${name}, but ${metadata.name} ` +
          `has no relation "${name}".`,
      );
    } else if (federated) {
      relations.set(name, { relation, distinctFilter });
    } else if (distinctFilter) {
      failures.push(
        `"${entityKey}" sets a distinctFilter on relation "${name}", which ` +
          'only applies to a federated relation. Set federated: true, or ' +
          'remove it.',
      );
    }
  }

  return { relations, failures };
}

/**
 * Check that every federated relation can be read: its target is registered
 * in `forRoot()` exactly once, found by entity name, and the junction of a
 * many-to-many by the rows it reads; the relation
 * reports the same columns as the target's repository, and is read by a
 * column on each side; and its `distinctFilter` is a condition on the
 * target's own columns. An entity with a federated relation cannot allow
 * eager relations, which would load it from the entity's own store.
 */
export function checkFederatedRelations(
  adapters: AnyAdapter[],
  registry: RepositoryRegistryService,
): string[] {
  return adapters.flatMap((adapter) => [
    ...checkNotEager(adapter),
    ...[...adapter.federatedRelations.values()].flatMap(
      ({ relation, distinctFilter }) => {
        const name = `"${adapter.entityKey}" relation "${relation.name}"`;
        const failures: string[] = [];

        if (
          !adapter.metadata.columns.some((c) => c.name === relation.on.from)
        ) {
          failures.push(
            `${name} is read by "${relation.on.from}", which is not a column ` +
              `of ${adapter.metadata.name}.`,
          );
        }

        const [target, ...others] = registry.getByEntityName(
          relation.targetEntity,
        );
        if (!target) {
          failures.push(
            `${name} is federated, but no repository for ` +
              `${relation.targetEntity} is registered in forRoot().`,
          );
        } else if (others.length > 0) {
          failures.push(
            `${name} is federated, but ${relation.targetEntity} is registered ` +
              `as ${[target, ...others].map(({ key }) => `"${key}"`).join(' and ')}, ` +
              'so which one to read through is ambiguous.',
          );
        } else {
          const own = target.adapter.metadata.columns.map((c) => c.name);
          const reported = relation.targetColumns.map((c) => c.name);
          const differ = [
            ...reported.filter((column) => !own.includes(column)),
            ...own.filter((column) => !reported.includes(column)),
          ];
          if (differ.length > 0) {
            failures.push(
              `${name} is federated, but its columns of ` +
                `${relation.targetEntity} differ from the "${target.key}" ` +
                `repository's: ${differ.join(', ')}. Define both entities ` +
                'with the same columns.',
            );
          }
          if (!own.includes(relation.on.to)) {
            failures.push(
              `${name} reads ${relation.targetEntity} by "${relation.on.to}", ` +
                `which is not a column of the "${target.key}" repository.`,
            );
          }
        }

        if (relation.through) {
          const junction = registry.getByUrn(relation.through.urn);
          const columns = new Set(
            junction?.adapter.metadata.columns.map((column) => column.name),
          );
          if (!junction) {
            failures.push(
              `${name} is a federated many-to-many, but no repository for ` +
                'its junction is registered in forRoot(). Register an ' +
                'entity for the junction table.',
            );
          } else if (
            !columns.has(relation.through.fromKey) ||
            !columns.has(relation.through.toKey)
          ) {
            failures.push(
              `${name} is read through "${junction.key}", which has no ` +
                `"${relation.through.fromKey}" and "${relation.through.toKey}" ` +
                'columns.',
            );
          }
        }

        if (distinctFilter?.relation !== undefined) {
          failures.push(
            `${name} has a distinctFilter tagged with relation ` +
              `"${distinctFilter.relation}". Write it on the related ` +
              `entity's own columns, without a relation.`,
          );
        } else if (
          distinctFilter &&
          !relation.targetColumns.some(
            (column) => column.name === distinctFilter.field,
          )
        ) {
          failures.push(
            `${name} has a distinctFilter on "${distinctFilter.field}", ` +
              `which is not a column of ${relation.targetEntity}.`,
          );
        }

        return failures;
      },
    ),
  ]);
}

function checkNotEager(adapter: AnyAdapter): string[] {
  const federated = [...adapter.federatedRelations.keys()];
  if (!adapter.allowsEagerRelations || federated.length === 0) return [];

  return [
    `"${adapter.entityKey}" allows eager relations, but ` +
      `${federated.map((name) => `"${name}"`).join(', ')} ` +
      `${federated.length === 1 ? 'is' : 'are'} federated, which an eager ` +
      `load would read from ${adapter.metadata.name}'s own store instead of ` +
      `its repository. Remove allowEagerRelations from ` +
      `"${adapter.entityKey}" in forRoot().`,
  ];
}

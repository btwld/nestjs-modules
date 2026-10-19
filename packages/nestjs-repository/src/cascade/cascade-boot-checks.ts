import { type PlainLiteralObject } from '@nestjs/common';

import { type RelationConfig } from '../interfaces/repository-provider-options.interface.js';
import { type RepositoryMetadataInterface } from '../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';
import { isAppendOnly } from '../write-policy/interfaces/write-policy-registration.interface.js';

import { type CascadeRelation } from './cascade-writer.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * An entity's cascade relations, from its `forRoot()` `relations` entry,
 * each with the repository of its related rows, and a message for each that
 * cannot cascade.
 *
 * A relation cascades only where the related row holds the foreign key to
 * this entity's single primary key column: one-to-many, or the inverse side
 * of a one-to-one. The related entity must be registered, and must be soft
 * deletable if this entity is.
 */
export function cascadeRelationsOf(
  entityKey: string,
  metadata: RepositoryMetadataInterface<PlainLiteralObject>,
  config: Readonly<Record<string, RelationConfig>> = {},
  adaptersByUrn: ReadonlyMap<string, AnyAdapter>,
): { relations: Map<string, CascadeRelation>; failures: string[] } {
  const relations = new Map<string, CascadeRelation>();
  const failures: string[] = [];
  const primary = metadata.columns
    .filter((column) => column.isPrimary)
    .map((column) => column.name);
  const softDeletes = metadata.columns.some((column) => column.isRemoveDate);

  for (const [name, { cascade, federated }] of Object.entries(config)) {
    const relation = metadata.relations?.find((each) => each.name === name);
    // An unknown relation is reported with the federation settings.
    if (!cascade || !relation) continue;

    const label = `"${entityKey}" relation "${name}"`;
    const target = adaptersByUrn.get(relation.targetUrn);

    if (federated) {
      failures.push(`${label} cannot be both federated and cascade.`);
    } else if (relation.foreignKey?.length) {
      failures.push(
        `${label} cannot cascade: ${metadata.name} holds its foreign key, ` +
          'and a write never changes the row it points to.',
      );
    } else if (relation.through) {
      failures.push(
        `${label} cannot cascade: it is many-to-many. Write its junction ` +
          'rows through their own repository.',
      );
    } else if (!target) {
      failures.push(
        `${label} cascades, but no repository for ${relation.targetEntity} ` +
          'is registered in forRoot().',
      );
    } else if (primary.length !== 1 || primary[0] !== relation.on.from) {
      failures.push(
        `${label} cannot cascade: it is joined on "${relation.on.from}", ` +
          `and only a join on ${metadata.name}'s single primary key column ` +
          'identifies its rows.',
      );
    } else if (
      !target.metadata.columns.some((column) => column.name === relation.on.to)
    ) {
      failures.push(
        `${label} cascades by "${relation.on.to}", which is not a column of ` +
          `the "${target.entityKey}" repository.`,
      );
    } else if (
      softDeletes &&
      !target.metadata.columns.some((column) => column.isRemoveDate)
    ) {
      failures.push(
        `${label} cannot cascade: ${metadata.name} is soft deleted, and ` +
          `${relation.targetEntity} has no delete date column.`,
      );
    } else {
      relations.set(name, { relation, target });
    }
  }

  return { relations, failures };
}

/**
 * Check that cascade relations never lead back to an entity they started
 * from: a cycle in the rows would make a cascading delete run forever.
 */
export function checkCascadeCycles(adapters: AnyAdapter[]): string[] {
  const failures: string[] = [];
  const done = new Set<AnyAdapter>();

  const visit = (adapter: AnyAdapter, path: string[], seen: AnyAdapter[]) => {
    if (done.has(adapter)) return;
    for (const [name, { target }] of adapter.cascadeRelations) {
      const step = [...path, `"${adapter.entityKey}".${name}`];
      if (seen.includes(target)) {
        failures.push(
          `Cascade relations form a cycle: ${step.join(' → ')} → ` +
            `"${target.entityKey}". Remove cascade from one of them.`,
        );
      } else {
        visit(target, step, [...seen, target]);
      }
    }
    done.add(adapter);
  };

  for (const adapter of adapters) visit(adapter, [], [adapter]);

  return failures;
}

/**
 * Check that no cascade relation leads to append-only rows, which a cascading
 * update or delete could never write, unless the entity itself is
 * append-only, so only its creates cascade.
 */
export function checkCascadeTargets(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    if (isAppendOnly(adapter.writePolicyDeclaration)) return [];

    return [...adapter.cascadeRelations]
      .filter(([, { target }]) => isAppendOnly(target.writePolicyDeclaration))
      .map(
        ([name, { relation }]) =>
          `"${adapter.entityKey}" relation "${name}" cascades into ` +
          `append-only ${relation.targetEntity}, so an update or delete of ` +
          `${adapter.metadata.name} could not reach it. Remove cascade, or ` +
          `make "${adapter.entityKey}" append-only too.`,
      );
  });
}

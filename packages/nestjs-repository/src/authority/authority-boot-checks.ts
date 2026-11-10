import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryMetadataInterface } from '../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * Every entity declares whether an authority governs it, when the deployment
 * requires a declaration.
 */
export function checkAuthorityDeclarationCompleteness(
  adapters: AnyAdapter[],
): string[] {
  return adapters.flatMap((adapter) => {
    if (adapter.authorityDeclaration) return [];

    return [
      `"${adapter.entityKey}" has no authority declaration, and this ` +
        'deployment requires one. Declare it governed, or declare it open ' +
        'with a reason.',
    ];
  });
}

/**
 * The relations of `metadata` whose rows, or whose junction rows, an
 * authority governs, each with the repositories of those rows, found by URN.
 */
export function findRelationsIntoGoverned(
  metadata: RepositoryMetadataInterface<PlainLiteralObject>,
  governedUrns: ReadonlySet<string>,
  adaptersByUrn: ReadonlyMap<string, AnyAdapter>,
): Map<string, AnyAdapter[]> {
  return new Map(
    (metadata.relations ?? []).flatMap(({ name, targetUrn, through }) => {
      const governed = [targetUrn, ...(through ? [through.urn] : [])]
        .filter((urn) => governedUrns.has(urn))
        .map((urn) => adaptersByUrn.get(urn))
        .filter((adapter) => adapter !== undefined);

      return governed.length > 0 ? [[name, governed] as const] : [];
    }),
  );
}

/**
 * No entity allowing eager relations has a relation into governed rows. An
 * eager relation is loaded on every read, as a join nobody decided.
 */
export function checkEagerRelationsIntoGoverned(
  adapters: AnyAdapter[],
): string[] {
  return adapters
    .filter(
      (adapter) =>
        adapter.allowsEagerRelations && adapter.relationsIntoGoverned.size > 0,
    )
    .map(
      (adapter) =>
        `"${adapter.entityKey}" allows eager relations, but ` +
        [...adapter.relationsIntoGoverned.keys()]
          .map((name) => `"${name}"`)
          .join(', ') +
        ' reach rows an authority governs, which an eager relation would ' +
        'read undecided on every read. Remove allowEagerRelations from ' +
        `"${adapter.entityKey}" in forRoot().`,
    );
}

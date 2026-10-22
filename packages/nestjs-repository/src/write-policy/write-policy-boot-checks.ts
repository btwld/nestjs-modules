import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryAdapter } from '../repository/repository-adapter.js';

import { isAppendOnly } from './interfaces/write-policy-registration.interface.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * Check that no append-only entity also carries a soft-delete column.
 *
 * The two are contradictory: a soft delete is an update that stamps a delete
 * date, which append-only refuses, so the column can only ever sit unused
 * while implying a capability the entity does not have. More practically, the
 * repository's own soft-delete immutability guard reads that column to decide
 * whether a row is mutable — a check that has no meaning once no row is.
 *
 * Reported rather than silently tolerated because the usual cause is
 * extending the driver's audited base entity, whose delete-date, update-date
 * and version columns are all dead weight on an append-only row.
 */
export function checkNoSoftDeleteOnAppendOnly(
  adapters: AnyAdapter[],
): string[] {
  return adapters.flatMap((adapter) => {
    if (!isAppendOnly(adapter.writePolicyDeclaration)) return [];

    const deleteDateColumn = adapter.getDeleteDateColumn();
    if (!deleteDateColumn) return [];

    return [
      `"${adapter.entityKey}" is declared append-only but has a soft-delete ` +
        `column ("${deleteDateColumn}"). A soft delete is an update, which ` +
        'append-only refuses, so the column can never be set. Extend a base ' +
        "entity without one, such as your driver's append-only base.",
    ];
  });
}

/**
 * Check that every entity declared a write policy.
 *
 * Opt-in per deployment, on the same reasoning as the equivalent row-scope
 * check: whether an undeclared entity is a mistake is a property of the
 * deployment.
 */
export function checkWritePolicyCompleteness(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    if (adapter.writePolicyDeclaration) return [];

    return [
      `"${adapter.entityKey}" has no writePolicy on its forRoot() entry, ` +
        "and this deployment requires one. Set writePolicy: { access: 'append-only', " +
        "reason } or { access: 'mutable' }.",
    ];
  });
}

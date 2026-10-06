import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryAdapter } from '../repository/repository-adapter.js';

import { isRowScopeScoped } from './interfaces/row-scope-registration.interface.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * Check that every entity declared scoped has a resolver bound to it.
 *
 * The adapter also refuses to serve calls while unbound, so this is the
 * earlier, louder half of the same guarantee — a misconfiguration surfaces at
 * startup rather than on the first request that happens to touch the entity.
 */
export function checkResolversBound(adapters: AnyAdapter[]): string[] {
  return adapters.flatMap((adapter) => {
    if (!isRowScopeScoped(adapter.rowScopeDeclaration)) return [];
    if (adapter.hasRowScopeResolver) return [];

    return [
      `"${adapter.entityKey}" declares a row scope but no resolver was bound ` +
        'to it. Either the entity was registered by calling the driver module ' +
        'directly rather than through RepositoryModule.forFeature(), or the ' +
        'resolver is request-scoped, which leaves the binding provider ' +
        'uninstantiated at bootstrap.',
    ];
  });
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

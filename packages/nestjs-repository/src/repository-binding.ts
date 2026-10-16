import { type PlainLiteralObject } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';

import { HookBootException } from './exceptions/hook-boot.exception.js';
import { RepositoryBootException } from './exceptions/repository-boot.exception.js';
import { type FederationOrchestrator } from './federation/federation-orchestrator.service.js';
import { checkHooksUsable } from './hooks/hook-boot-checks.js';
import { type RepositoryModuleOptionsInterface } from './interfaces/repository-module-options.interface.js';
import { type RepositoryProviderOptions } from './interfaces/repository-provider-options.interface.js';
import { RepositoryAdapter } from './repository/repository-adapter.js';
import {
  checkColumnsAreNotRelations,
  checkForeignKeyColumns,
  checkNoAccessorKeys,
} from './repository/repository-boot-checks.js';
import { RowScopeBootException } from './row-scope/exceptions/row-scope-boot.exception.js';
import { isRowScopeScoped } from './row-scope/interfaces/row-scope-registration.interface.js';
import {
  checkDeclarationCompleteness,
  checkEagerRelationsIntoScoped,
  checkRelationsIntoScoped,
  findRelationsIntoScoped,
} from './row-scope/row-scope-boot-checks.js';
import {
  REPOSITORY_REGISTRY,
  type RepositoryRegistryService,
} from './services/repository-registry.service.js';
import { WritePolicyBootException } from './write-policy/exceptions/write-policy-boot.exception.js';
import {
  checkNoSoftDeleteOnAppendOnly,
  checkWritePolicyCompleteness,
} from './write-policy/write-policy-boot-checks.js';

/**
 * Every repository `RepositoryModule.forRoot()` registered, by key, provided
 * once they are bound and checked. `RepositoryModule.forFeature()` hands
 * repositories out from it, so none leaves before then.
 *
 * The description is what Nest names when a module imports `forFeature()`
 * without `forRoot()`.
 */
export const REPOSITORY_BINDING = Symbol(
  'RepositoryModule.forRoot() binding — import RepositoryModule.forRoot()',
);

/**
 * The value `REPOSITORY_BINDING` provides.
 */
export type RepositoryBinding = ReadonlyMap<
  string,
  RepositoryAdapter<PlainLiteralObject>
>;

/**
 * One entity `RepositoryModule.forRoot()` registered, with its driver's name.
 */
export interface RepositoryBindingEntry {
  readonly driverName: string;
  readonly options: RepositoryProviderOptions;
}

/**
 * Bind every repository to its declarations, register it, and run every
 * startup check over the whole set.
 *
 * Runs once, synchronously, while the module is compiled, so a failure stops
 * the application before anything can read through an unchecked repository.
 * Row scope resolvers are attached by providers of their own: a request-scoped
 * resolver anywhere in this provider's dependencies would keep it from running
 * at all.
 */
export function bindRepositories(params: {
  entries: RepositoryBindingEntry[];
  repos: unknown[];
  moduleOptions: RepositoryModuleOptionsInterface;
  registry: RepositoryRegistryService;
  orchestrator: FederationOrchestrator;
  moduleRef: ModuleRef;
}): RepositoryBinding {
  const { entries, repos, moduleOptions, registry, orchestrator, moduleRef } =
    params;

  // Two forRoot() calls, identical or not, make two global registries, each
  // checking only its own entities.
  const registries = moduleRef.get(REPOSITORY_REGISTRY, {
    strict: false,
    each: true,
  });
  if (registries.length > 1) {
    throw new RepositoryBootException([
      'RepositoryModule.forRoot() is imported more than once. Import it once, ' +
        "in the application's root module, with every entity.",
    ]);
  }

  // Anything else would carry none of the declarations, and nothing could
  // check it, so it is refused rather than handed out.
  const adapters = repos.filter(
    (repo): repo is RepositoryAdapter<PlainLiteralObject> =>
      repo instanceof RepositoryAdapter,
  );
  if (adapters.length !== repos.length) {
    throw new RepositoryBootException(
      entries
        .filter((_entry, index) => !(repos[index] instanceof RepositoryAdapter))
        .map(
          ({ driverName, options }) =>
            `Driver "${driverName}" registered "${options.key}" with a ` +
            'repository that does not extend RepositoryAdapter.',
        ),
    );
  }

  registry.register(
    entries.map(({ options }, index) => ({
      key: options.key,
      entityName: adapters[index].metadata.name,
      urn: adapters[index].metadata.urn,
      adapter: adapters[index],
    })),
  );

  const scopedUrns = new Set(
    entries.flatMap(({ options }, index) =>
      isRowScopeScoped(options.rowScope) ? [adapters[index].metadata.urn] : [],
    ),
  );

  entries.forEach(({ options }, index) => {
    adapters[index].bind({
      rowScope: options.rowScope,
      hooks: options.hooks,
      writePolicy: options.writePolicy,
      allowEagerRelations: options.allowEagerRelations,
      relationsIntoScoped: findRelationsIntoScoped(
        adapters[index].metadata,
        scopedUrns,
      ),
      federationOrchestrator: orchestrator,
    });
  });

  const repositoryFailures = [
    ...checkColumnsAreNotRelations(adapters),
    ...checkForeignKeyColumns(adapters),
    ...checkNoAccessorKeys(adapters),
  ];
  if (repositoryFailures.length > 0) {
    throw new RepositoryBootException(repositoryFailures);
  }

  const rowScopeFailures = [
    ...checkRelationsIntoScoped(adapters),
    ...checkEagerRelationsIntoScoped(adapters),
    ...(moduleOptions.requireRowScopeDeclaration
      ? checkDeclarationCompleteness(adapters)
      : []),
  ];
  if (rowScopeFailures.length > 0) {
    throw new RowScopeBootException(rowScopeFailures);
  }

  const writePolicyFailures = [
    ...checkNoSoftDeleteOnAppendOnly(adapters),
    ...(moduleOptions.requireWritePolicyDeclaration
      ? checkWritePolicyCompleteness(adapters)
      : []),
  ];
  if (writePolicyFailures.length > 0) {
    throw new WritePolicyBootException(writePolicyFailures);
  }

  const hookFailures = [...checkHooksUsable(adapters, moduleRef)];
  if (hookFailures.length > 0) {
    throw new HookBootException(hookFailures);
  }

  return new Map(
    entries.map(({ options }, index) => [options.key, adapters[index]]),
  );
}

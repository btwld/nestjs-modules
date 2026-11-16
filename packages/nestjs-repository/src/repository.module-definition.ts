import {
  type DynamicModule,
  type ModuleMetadata,
  type Provider,
  Scope,
  type Type,
} from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants.js';
import { ModuleRef } from '@nestjs/core';

import { type AuthorityInterface } from '@concepta/nestjs-core';

import { AuthorityBootException } from './authority/exceptions/authority-boot.exception.js';
import { isAuthorityGoverned } from './authority/interfaces/authority-registration.interface.js';
import { RepositoryBootException } from './exceptions/repository-boot.exception.js';
import { RepositoryDuplicateKeyException } from './exceptions/repository-duplicate-key.exception.js';
import {
  FEDERATION_READER,
  FederationReader,
} from './federation/federation-reader.service.js';
import { TransactionInterceptor } from './interceptors/transaction.interceptor.js';
import { type RepositoryModuleOptionsInterface } from './interfaces/repository-module-options.interface.js';
import { type RepositoryAdapterRegistration } from './interfaces/repository-root-options.interface.js';
import { RepositoryBindingCheck } from './repository-binding.check.js';
import {
  bindRepositories,
  REPOSITORY_BINDING,
  type RepositoryBinding,
  type RepositoryBindingEntry,
} from './repository-binding.js';
import { REPOSITORY_MODULE_OPTIONS } from './repository.constants.js';
import { RowScopeBootException } from './row-scope/exceptions/row-scope-boot.exception.js';
import { isRowScopeScoped } from './row-scope/interfaces/row-scope-registration.interface.js';
import { type RowScopeInterface } from './row-scope/interfaces/row-scope.interface.js';
import {
  RepositoryRegistryService,
  REPOSITORY_REGISTRY,
} from './services/repository-registry.service.js';
import {
  TransactionFactoryRegistry,
  TRANSACTION_FACTORY_REGISTRY,
} from './transaction/transaction-factory-registry.js';
import { TransactionScope } from './transaction/transaction-scope.js';
import { TransactionalRunner } from './transaction/transactional-runner.js';
import { getDynamicRepositoryToken } from './utils/get-dynamic-repository-token.js';

/**
 * Build the global module `RepositoryModule.forRoot()` and `forRootAsync()`
 * return.
 *
 * Every driver registers its entities here, and one provider binds and checks
 * them all. Only that provider's result is exported, for
 * `RepositoryModule.forFeature()` to hand repositories out from.
 */
export function createRepositoryRootModule(params: {
  module: Type;
  adapters: RepositoryAdapterRegistration[];
  imports: NonNullable<ModuleMetadata['imports']>;
  optionsProvider: Provider<RepositoryModuleOptionsInterface>;
}): DynamicModule {
  const { module, adapters, imports, optionsProvider } = params;

  // Copied before any driver sees the entries, so nothing a driver does to
  // them can change what is checked and bound.
  const entries: RepositoryBindingEntry[] = adapters.flatMap(
    ({ adapter, entities }) =>
      entities.map((options) => ({
        adapterName: adapter.name,
        options: {
          ...options,
          rowScope: options.rowScope && { ...options.rowScope },
          authority: options.authority && { ...options.authority },
          hooks: options.hooks && [...options.hooks],
          writePolicy: options.writePolicy && { ...options.writePolicy },
          activity: options.activity && {
            ...options.activity,
            omit: options.activity.omit && [...options.activity.omit],
          },
        },
      })),
  );

  assertDistinctAdapters(adapters);
  assertDistinctKeys(entries);
  assertResolversNotRequestScoped(entries);

  const adapterModules = adapters.map(({ adapter, entities, options }) =>
    adapter.register(entities, options),
  );
  const transactionFactories = adapterModules.flatMap(
    ({ transactionFactories: factories = [] }) => factories,
  );
  assertDistinctTransactionKeys(transactionFactories.map(({ key }) => key));

  const repoTokens = entries.map(({ options }) =>
    getDynamicRepositoryToken(options.key),
  );

  const providers: Provider[] = [
    optionsProvider,
    ...createRepositoryProviders(),
    {
      provide: RepositoryBindingCheck,
      inject: [ModuleRef],
      useFactory: (moduleRef: ModuleRef) =>
        new RepositoryBindingCheck(
          moduleRef,
          transactionFactories.map(({ key }) => key),
        ),
    },
    ...adapterModules.flatMap(({ providers: registered = [] }) => registered),
    {
      provide: REPOSITORY_BINDING,
      inject: [
        REPOSITORY_MODULE_OPTIONS,
        REPOSITORY_REGISTRY,
        FEDERATION_READER,
        ModuleRef,
        ...repoTokens,
      ],
      useFactory: (
        moduleOptions: RepositoryModuleOptionsInterface,
        registry: RepositoryRegistryService,
        reader: FederationReader,
        moduleRef: ModuleRef,
        ...repos: unknown[]
      ) =>
        bindRepositories({
          entries,
          repos,
          moduleOptions,
          registry,
          reader,
          moduleRef,
        }),
    },
    // Row scope resolver — one provider per scoped entity, depending on the
    // repository, its resolver and the binding, so the resolver is attached
    // after bind() declared the entity scoped, and before any onModuleInit
    // can run a seeder. Kept apart from the binding above: a resolver
    // depending on a request-scoped provider would keep the provider
    // injecting it from running at all, and the entity then refuses every
    // call rather than run unscoped.
    ...entries.flatMap(({ options }) => {
      const registration = options.rowScope;
      if (!isRowScopeScoped(registration)) return [];

      return [
        {
          provide: Symbol(`ROW_SCOPE_BINDING_${options.key}`),
          inject: [REPOSITORY_BINDING, registration.resolver],
          useFactory: (
            binding: RepositoryBinding,
            resolver: RowScopeInterface,
          ) => {
            binding.get(options.key)?.setRowScopeResolver(resolver);
            return true;
          },
        },
      ];
    }),
    // Authority — one provider per governed entity, kept apart from the
    // binding for the same reason as the row scope resolvers above.
    ...entries.flatMap(({ options }) => {
      const registration = options.authority;
      if (!isAuthorityGoverned(registration)) return [];

      return [
        {
          provide: Symbol(`AUTHORITY_BINDING_${options.key}`),
          inject: [REPOSITORY_BINDING, registration.authority],
          useFactory: (
            binding: RepositoryBinding,
            authority: AuthorityInterface,
          ) => {
            const adapter = binding.get(options.key);
            if (!adapter) return true;
            adapter.setAuthority(authority);
            authority.govern?.(
              options.key,
              adapter.metadata.columns.map(({ name }) => name),
            );
            return true;
          },
        },
      ];
    }),
    ...transactionFactories.map((descriptor) => ({
      provide: Symbol(`TX_FACTORY_${descriptor.key}`),
      inject: [TRANSACTION_FACTORY_REGISTRY, ...descriptor.inject],
      useFactory: (
        registry: TransactionFactoryRegistry,
        ...args: unknown[]
      ) => {
        registry.register(descriptor.key, descriptor.useFactory(...args));
        return null;
      },
    })),
  ];

  return {
    module,
    global: true,
    imports: [
      ...imports,
      ...adapterModules.flatMap(({ imports: registered = [] }) => registered),
    ],
    providers,
    exports: [...createRepositoryExports(), REPOSITORY_BINDING],
  };
}

function assertDistinctAdapters(
  adapters: RepositoryAdapterRegistration[],
): void {
  const names = adapters.map(({ adapter }) => adapter.name);
  const repeated = names.filter((name, i) => names.indexOf(name) !== i);

  if (repeated.length > 0) {
    throw new RepositoryBootException(
      [...new Set(repeated)].map(
        (name) =>
          `Driver "${name}" is listed more than once in ` +
          'RepositoryModule.forRoot(). List each driver once, with all of ' +
          'its entities.',
      ),
    );
  }
}

function assertDistinctKeys(entries: RepositoryBindingEntry[]): void {
  const firstByKey = new Map<string, string>();
  const duplicates: { key: string; existing: string; attempted: string }[] = [];

  for (const { options } of entries) {
    const existing = firstByKey.get(options.key);
    if (existing === undefined) {
      firstByKey.set(options.key, options.entity.name);
    } else {
      duplicates.push({
        key: options.key,
        existing,
        attempted: options.entity.name,
      });
    }
  }

  if (duplicates.length > 0) {
    throw new RepositoryDuplicateKeyException(duplicates);
  }
}

/**
 * Refuse a resolver declared request-scoped, before anything is built. One
 * that is request-scoped only through a dependency is refused once every
 * provider is built, by `RepositoryBindingCheck`.
 */
function assertResolversNotRequestScoped(
  entries: RepositoryBindingEntry[],
): void {
  const failures = entries.flatMap(({ options }) => {
    const registration = options.rowScope;
    if (!isRowScopeScoped(registration)) return [];
    if (!isRequestScoped(registration.resolver)) return [];

    return [
      `"${options.key}" declares the request-scoped resolver ` +
        `${registration.resolver.name}. Resolvers are bound once, at ` +
        'startup; make it singleton-scoped and read the caller from ctx.',
    ];
  });

  if (failures.length > 0) {
    throw new RowScopeBootException(failures);
  }

  const authorityFailures = entries.flatMap(({ options }) => {
    const registration = options.authority;
    if (!isAuthorityGoverned(registration)) return [];
    if (!isRequestScoped(registration.authority)) return [];

    return [
      `"${options.key}" declares the request-scoped authority ` +
        `${registration.authority.name}. Authorities are bound once, at ` +
        'startup; make it singleton-scoped and read the caller from ctx.',
    ];
  });

  if (authorityFailures.length > 0) {
    throw new AuthorityBootException(authorityFailures);
  }
}

function isRequestScoped(type: Type): boolean {
  const scopeOptions: unknown = Reflect.getMetadata(
    SCOPE_OPTIONS_METADATA,
    type,
  );
  return (
    typeof scopeOptions === 'object' &&
    scopeOptions !== null &&
    'scope' in scopeOptions &&
    scopeOptions.scope === Scope.REQUEST
  );
}

function assertDistinctTransactionKeys(keys: string[]): void {
  const repeated = keys.filter((key, i) => keys.indexOf(key) !== i);

  if (repeated.length > 0) {
    throw new RepositoryBootException(
      [...new Set(repeated)].map(
        (key) =>
          `Transaction key "${key}" is registered by more than one driver. ` +
          'Each driver must name its transaction keys uniquely.',
      ),
    );
  }
}

function createRepositoryProviders(): Provider[] {
  return [
    {
      provide: TRANSACTION_FACTORY_REGISTRY,
      useClass: TransactionFactoryRegistry,
    },
    {
      provide: REPOSITORY_REGISTRY,
      useClass: RepositoryRegistryService,
    },
    {
      provide: FEDERATION_READER,
      useClass: FederationReader,
    },
    TransactionScope,
    TransactionalRunner,
    TransactionInterceptor,
  ];
}

function createRepositoryExports(): (
  | symbol
  | typeof TransactionScope
  | typeof TransactionFactoryRegistry
  | typeof TransactionalRunner
  | typeof TransactionInterceptor
)[] {
  return [
    REPOSITORY_MODULE_OPTIONS,
    TRANSACTION_FACTORY_REGISTRY,
    REPOSITORY_REGISTRY,
    FEDERATION_READER,
    TransactionScope,
    TransactionalRunner,
    TransactionInterceptor,
  ];
}

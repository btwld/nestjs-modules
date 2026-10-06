import { Module, DynamicModule, Provider } from '@nestjs/common';

import {
  FEDERATION_ORCHESTRATOR,
  FederationOrchestrator,
} from './federation/federation-orchestrator.service.js';
import { RepositoryFeatureOptions } from './interfaces/repository-feature-options.interface.js';
import { DynamicRepositoryModule } from './interfaces/repository-module.interface.js';
import { RepositoryAdapter } from './repository/repository-adapter.js';
import { RepositoryModuleClass } from './repository.module-definition.js';
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
import { getDynamicRepositoryToken } from './utils/get-dynamic-repository-token.js';

/**
 * Repository module providing data access abstraction with transaction support.
 *
 * @example
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     RepositoryModule.forRoot({}),
 *     RepositoryModule.forFeature({
 *       module: TypeOrmRepositoryModule,
 *       entities: [
 *         { key: 'orders', entity: Order },
 *         { key: 'customers', entity: Customer },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class RepositoryModule extends RepositoryModuleClass {
  /**
   * Register repositories for entities.
   *
   * Delegates to the repository module's forFeature method.
   *
   * @example
   * ```typescript
   * RepositoryModule.forFeature({
   *   module: TypeOrmRepositoryModule,
   *   entities: [
   *     { key: 'orders', entity: Order },
   *     { key: 'customers', entity: Customer },
   *   ],
   * })
   * ```
   */
  static forFeature(options: RepositoryFeatureOptions): DynamicModule {
    const { module, entities, imports = [] } = options;
    const dynamicModule: DynamicRepositoryModule = module.forFeature(entities);
    const moduleName = module.name;

    const providers: Provider[] = [...(dynamicModule.providers ?? [])];

    // Repository registry registration
    const registrationToken = Symbol(
      `REPOSITORY_REGISTRATION_${moduleName}_${Date.now()}`,
    );

    const repoTokens = entities.map((e) => getDynamicRepositoryToken(e.key));

    providers.push({
      provide: registrationToken,
      inject: [REPOSITORY_REGISTRY, FEDERATION_ORCHESTRATOR, ...repoTokens],
      useFactory: (
        registry: RepositoryRegistryService,
        orchestrator: FederationOrchestrator,
        ...repos: unknown[]
      ) => {
        for (const entity of entities) {
          registry.register({
            key: entity.key,
            entityName: entity.entity.name,
            moduleName,
          });
        }
        for (const repo of repos) {
          if (repo instanceof RepositoryAdapter) {
            repo.setFederationOrchestrator(orchestrator);
          }
        }
        return true;
      },
    });

    // Row scope binding — one provider per scoped entity, depending on both
    // the repository and its resolver, so Nest constructs both before binding
    // and the whole graph is bound before any onModuleInit can run a seeder.
    // Deliberately not delegated to the driver's provider factory: a driver
    // that forgot would fail open, and no driver can forget what it never does.
    for (const entity of entities) {
      const registration = entity.rowScope;
      if (!isRowScopeScoped(registration)) continue;

      providers.push({
        provide: Symbol(`ROW_SCOPE_BINDING_${entity.key}_${Date.now()}`),
        inject: [getDynamicRepositoryToken(entity.key), registration.resolver],
        useFactory: (repo: unknown, resolver: RowScopeInterface) => {
          if (repo instanceof RepositoryAdapter) {
            repo.setRowScope(resolver);
          }
          return true;
        },
      });
    }

    // Hook binding — one provider per entity that registered hooks. Same
    // reasoning as the row scope binding above: a driver that forgot would
    // leave the hooks unbound, and the adapter then refuses rather than
    // running as though the entity had none.
    //
    // The hook classes are deliberately not injected here. Resolution stays
    // `moduleRef.get(hook, { strict: false })` at call time, as it has always
    // been for `@UseHooks`, so a hook provided in two modules cannot yield one
    // instance at boot and a different one at runtime — and registering a hook
    // needs no `imports` entry. The startup checks cover resolvability.
    for (const entity of entities) {
      if (!entity.hooks?.length) continue;

      providers.push({
        provide: Symbol(`HOOK_BINDING_${entity.key}_${Date.now()}`),
        inject: [getDynamicRepositoryToken(entity.key)],
        useFactory: (repo: unknown) => {
          if (repo instanceof RepositoryAdapter) {
            repo.setHooks(entity.hooks ?? []);
          }
          return true;
        },
      });
    }

    // Transaction factory registration
    if (dynamicModule.transactionFactories) {
      for (const descriptor of dynamicModule.transactionFactories) {
        const txToken = Symbol(`TX_FACTORY_${descriptor.key}_${Date.now()}`);
        providers.push({
          provide: txToken,
          inject: [
            { token: TRANSACTION_FACTORY_REGISTRY, optional: true },
            ...descriptor.inject,
          ],
          useFactory: (
            registry: TransactionFactoryRegistry | undefined,
            ...args: unknown[]
          ) => {
            if (registry) {
              const factory = descriptor.useFactory(...args);
              registry.register(descriptor.key, factory);
            }
            return null;
          },
        });
      }
    }

    // Export public tokens (providers now use getDynamicRepositoryToken directly)
    const exports = entities.map((entity) =>
      getDynamicRepositoryToken(entity.key),
    );

    return {
      ...dynamicModule,
      imports: [...(dynamicModule.imports ?? []), ...imports],
      providers,
      exports,
    };
  }
}

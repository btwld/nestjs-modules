import { Module, DynamicModule, Provider } from '@nestjs/common';

import {
  FEDERATION_ORCHESTRATOR,
  FederationOrchestrator,
} from './federation/federation-orchestrator.service.js';
import { RepositoryFeatureOptions } from './interfaces/repository-feature-options.interface.js';
import { DynamicRepositoryModule } from './interfaces/repository-module.interface.js';
import { RepositoryAdapter } from './repository/repository-adapter.js';
import { RepositoryModuleClass } from './repository.module-definition.js';
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
    const { module, entities } = options;
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
      providers,
      exports,
    };
  }
}

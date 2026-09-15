import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';

import {
  FEDERATION_ORCHESTRATOR,
  FederationOrchestrator,
} from './federation/federation-orchestrator.service.js';
import { TransactionInterceptor } from './interceptors/transaction.interceptor.js';
import { type RepositoryModuleOptionsInterface } from './interfaces/repository-module-options.interface.js';
import { REPOSITORY_MODULE_OPTIONS } from './repository.constants.js';
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

const RAW_OPTIONS_TOKEN = Symbol('__REPOSITORY_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: RepositoryModuleClass,
  OPTIONS_TYPE: REPOSITORY_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: REPOSITORY_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<RepositoryModuleOptionsInterface>({
  moduleName: 'Repository',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras({}, (definition: DynamicModule) => {
    const { providers = [] } = definition;

    return {
      ...definition,
      global: true,
      providers: createRepositoryProviders({ providers }),
      exports: createRepositoryExports(),
    };
  })
  .setClassMethodName('forRoot')
  .build();

export type RepositoryOptions = typeof REPOSITORY_OPTIONS_TYPE;
export type RepositoryAsyncOptions = typeof REPOSITORY_ASYNC_OPTIONS_TYPE;

export function createRepositoryProviders(options: {
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    {
      provide: REPOSITORY_MODULE_OPTIONS,
      useExisting: RAW_OPTIONS_TOKEN,
    },
    {
      provide: TRANSACTION_FACTORY_REGISTRY,
      useClass: TransactionFactoryRegistry,
    },
    {
      provide: REPOSITORY_REGISTRY,
      useClass: RepositoryRegistryService,
    },
    {
      provide: FEDERATION_ORCHESTRATOR,
      useClass: FederationOrchestrator,
    },
    TransactionScope,
    TransactionalRunner,
    TransactionInterceptor,
  ];
}

export function createRepositoryExports(): (
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
    FEDERATION_ORCHESTRATOR,
    TransactionScope,
    TransactionalRunner,
    TransactionInterceptor,
  ];
}

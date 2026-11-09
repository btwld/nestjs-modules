import { type OnModuleInit } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';

import { RepositoryBootException } from './exceptions/repository-boot.exception.js';
import {
  REPOSITORY_BINDING,
  type RepositoryBinding,
} from './repository-binding.js';
import { RowScopeBootException } from './row-scope/exceptions/row-scope-boot.exception.js';
import { isRowScopeScoped } from './row-scope/interfaces/row-scope-registration.interface.js';
import {
  type TransactionFactoryRegistry,
  TRANSACTION_FACTORY_REGISTRY,
} from './transaction/transaction-factory-registry.js';

/**
 * Refuse to start when the repositories were not bound at startup, a
 * driver's transaction factory was never registered, or a scoped entity's
 * resolver was never attached.
 *
 * Runs once every provider is built, and depends on nothing that could be
 * request-scoped: anything request-scoped behind the binding, a transaction
 * factory or a resolver keeps it from being built at startup, which can only
 * be seen after Nest has resolved the whole graph.
 */
export class RepositoryBindingCheck implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly transactionKeys: string[],
  ) {}

  onModuleInit(): void {
    const binding = this.getBinding();
    this.checkTransactionFactories();

    const failures = [...binding].flatMap(([key, adapter]) => {
      const declaration = adapter.rowScopeDeclaration;
      if (!isRowScopeScoped(declaration) || adapter.hasRowScopeResolver) {
        return [];
      }

      return [
        `"${key}" declares the resolver ${declaration.resolver.name}, which ` +
          'was never built at startup because it, or something it depends ' +
          'on, is request-scoped. Keep the resolver and its dependencies ' +
          'singleton-scoped and read the caller from ctx.',
      ];
    });

    if (failures.length > 0) {
      throw new RowScopeBootException(failures);
    }
  }

  private checkTransactionFactories(): void {
    const registry = this.moduleRef.get<TransactionFactoryRegistry>(
      TRANSACTION_FACTORY_REGISTRY,
    );
    const failures = this.transactionKeys
      .filter((key) => !registry.get(key))
      .map(
        (key) =>
          `The transaction factory "${key}" was never registered at startup ` +
          'because something it injects is request-scoped. Keep its ' +
          'dependencies singleton-scoped.',
      );

    if (failures.length > 0) {
      throw new RepositoryBootException(failures);
    }
  }

  private getBinding(): RepositoryBinding {
    try {
      return this.moduleRef.get<RepositoryBinding>(REPOSITORY_BINDING);
    } catch (error) {
      throw new RepositoryBootException(
        [
          'The repositories were never bound at startup because something ' +
            'they depend on is request-scoped: a forRootAsync() inject, or a ' +
            "driver's provider. Keep them singleton-scoped.",
        ],
        { originalError: error },
      );
    }
  }
}

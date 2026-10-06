import { type DynamicModule, type InjectionToken } from '@nestjs/common';

import { type RepositoryProviderOptions } from './repository-provider-options.interface.js';
import { type TransactionFactoryInterface } from './transaction-factory.interface.js';

/**
 * Descriptor for a transaction factory that a respository module wants to register.
 * RepositoryModule handles the actual registration with the registry.
 */
export interface TransactionFactoryDescriptor {
  /**
   * Transaction key (e.g., 'typeorm:default', 'mongoose:default').
   */
  key: string;

  /**
   * Injection tokens needed to create the factory.
   */
  inject: InjectionToken[];

  /**
   * Factory function that creates the TransactionFactoryInterface.
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  useFactory: (...args: any[]) => TransactionFactoryInterface;
}

/**
 * Result returned by repository module's forFeature method.
 * Extends DynamicModule with optional transaction factory descriptors.
 */
export interface DynamicRepositoryModule extends DynamicModule {
  /**
   * Transaction factory descriptors for RepositoryModule to register.
   */
  transactionFactories?: TransactionFactoryDescriptor[];
}

/**
 * Interface for repository module classes that provide a static forFeature().
 * Repository packages implement this to provide their own module.
 *
 * This describes the static side of the class (the constructor object itself).
 */
export interface RepositoryModuleInterface {
  /**
   * The class name of the module (inherited from Function.prototype.name).
   */
  readonly name: string;

  /**
   * Register repositories for entities.
   * This is a static method on the module class.
   */
  forFeature(entities: RepositoryProviderOptions[]): DynamicRepositoryModule;
}

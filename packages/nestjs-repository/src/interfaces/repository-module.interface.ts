import {
  type DynamicModule,
  type InjectionToken,
  type PlainLiteralObject,
} from '@nestjs/common';

import { type RepositoryProviderOptions } from './repository-provider-options.interface.js';
import { type TransactionFactoryInterface } from './transaction-factory.interface.js';

/**
 * Descriptor for a transaction factory that a respository module wants to register.
 * RepositoryModule handles the actual registration with the registry.
 */
export interface TransactionFactoryDescriptor {
  /**
   * Transaction key, unique per driver and data source (e.g.,
   * '<driver>:default').
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
 * Result returned by a driver's `register` method: its repository providers,
 * the modules they need, and its transaction factories.
 * `RepositoryModule.forRoot()` exports the repositories itself.
 */
export interface DynamicRepositoryModule extends Pick<
  DynamicModule,
  'module' | 'imports' | 'providers'
> {
  /**
   * Transaction factory descriptors for RepositoryModule to register.
   */
  transactionFactories?: TransactionFactoryDescriptor[];
}

/**
 * A repository driver: the static side of the driver's module class.
 *
 * `RepositoryModule.forRoot()` calls `register` with the entities listed under
 * the driver, then binds and checks every repository it returns. Applications
 * do not call `register` themselves.
 */
export interface RepositoryDriverInterface<
  Options extends RepositoryProviderOptions = RepositoryProviderOptions,
  DriverOptions extends PlainLiteralObject = PlainLiteralObject,
> {
  /**
   * The class name of the driver's module (inherited from
   * Function.prototype.name). Two drivers in one application must have
   * different names.
   */
  readonly name: string;

  /**
   * Build one repository provider per entity, each under
   * `getDynamicRepositoryToken(key)`. `options` are the driver's own, as
   * given on its registration.
   */
  register(
    entities: Options[],
    options?: DriverOptions,
  ): DynamicRepositoryModule;
}

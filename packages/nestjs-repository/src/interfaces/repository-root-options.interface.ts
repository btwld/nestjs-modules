import { type InjectionToken, type ModuleMetadata } from '@nestjs/common';

import { type RepositoryModuleOptionsInterface } from './repository-module-options.interface.js';
import { type RepositoryDriverInterface } from './repository-module.interface.js';
import { type RepositoryProviderOptions } from './repository-provider-options.interface.js';

/**
 * One driver and the entities it serves.
 *
 * `entities` is checked against the driver's own options, so a misspelled
 * option, or one only another driver understands, does not compile.
 */
export interface RepositoryDriverRegistration<
  Options extends RepositoryProviderOptions = RepositoryProviderOptions,
> {
  /**
   * The driver's module class.
   */
  driver: RepositoryDriverInterface<Options>;

  /**
   * Entity registrations served by this driver.
   */
  entities: NoInfer<Options>[];
}

/**
 * One {@link RepositoryDriverRegistration} per element of `Options`, each typed
 * by its own driver.
 */
export type RepositoryDriverRegistrations<
  Options extends readonly RepositoryProviderOptions[],
> = {
  [K in keyof Options]: RepositoryDriverRegistration<Options[K]>;
};

/**
 * What `RepositoryModule.forRoot()` and `forRootAsync()` share: every entity
 * the application registers, and the modules its row scope resolvers come
 * from.
 */
export interface RepositoryRootRegistrationOptions<
  Options extends readonly RepositoryProviderOptions[],
> {
  /**
   * Every entity in the application, grouped by the driver that serves it.
   */
  drivers?: [...RepositoryDriverRegistrations<Options>];

  /**
   * Modules exporting the row scope resolvers that entities declare, and,
   * for `forRootAsync()`, whatever `inject` names.
   */
  imports?: ModuleMetadata['imports'];
}

/**
 * Options for `RepositoryModule.forRoot()`.
 */
export type RepositoryRootOptions<
  Options extends readonly RepositoryProviderOptions[],
> = RepositoryRootRegistrationOptions<Options> &
  RepositoryModuleOptionsInterface;

/**
 * Options for `RepositoryModule.forRootAsync()`.
 *
 * Entities are static: providers are created from them before any factory
 * runs. Only the module options come from `useFactory`.
 */
export interface RepositoryRootAsyncOptions<
  Options extends readonly RepositoryProviderOptions[],
> extends RepositoryRootRegistrationOptions<Options> {
  /**
   * Tokens injected into `useFactory`.
   */
  inject?: InjectionToken[];

  /**
   * Build the module options.
   */
  useFactory: (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    ...args: any[]
  ) =>
    | RepositoryModuleOptionsInterface
    | Promise<RepositoryModuleOptionsInterface>;
}

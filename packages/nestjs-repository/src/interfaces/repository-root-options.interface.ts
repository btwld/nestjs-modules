import { type InjectionToken, type ModuleMetadata } from '@nestjs/common';

import { type RepositoryModuleOptionsInterface } from './repository-module-options.interface.js';
import { type RepositoryDriverInterface } from './repository-module.interface.js';

/**
 * One driver, the entities it serves, and its own options.
 *
 * `entities` and `options` are checked against the driver's own types, so a
 * misspelled option, or one only another driver understands, does not
 * compile.
 */
export interface RepositoryDriverRegistration<
  Driver extends RepositoryDriverInterface = RepositoryDriverInterface,
> {
  /**
   * The driver's module class.
   */
  driver: Driver;

  /**
   * Entity registrations served by this driver.
   */
  entities: NoInfer<RepositoryDriverEntityOptions<Driver>>[];

  /**
   * The driver's own options, for everything it serves.
   */
  options?: NoInfer<RepositoryDriverOptions<Driver>>;
}

/**
 * The entity options a driver accepts.
 */
export type RepositoryDriverEntityOptions<
  Driver extends RepositoryDriverInterface,
> = Parameters<Driver['register']>[0][number];

/**
 * The driver-level options a driver accepts; `undefined` when it takes none.
 */
export type RepositoryDriverOptions<Driver extends RepositoryDriverInterface> =
  Parameters<Driver['register']>[1];

/**
 * One {@link RepositoryDriverRegistration} per element of `Drivers`, each typed
 * by its own driver.
 */
export type RepositoryDriverRegistrations<
  Drivers extends readonly RepositoryDriverInterface[],
> = {
  [K in keyof Drivers]: RepositoryDriverRegistration<Drivers[K]>;
};

/**
 * What `RepositoryModule.forRoot()` and `forRootAsync()` share: every entity
 * the application registers, and the modules its row scope resolvers come
 * from.
 */
export interface RepositoryRootRegistrationOptions<
  Drivers extends readonly RepositoryDriverInterface[],
> {
  /**
   * Every entity in the application, grouped by the driver that serves it.
   */
  drivers?: [...RepositoryDriverRegistrations<Drivers>];

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
  Drivers extends readonly RepositoryDriverInterface[],
> = RepositoryRootRegistrationOptions<Drivers> &
  RepositoryModuleOptionsInterface;

/**
 * Options for `RepositoryModule.forRootAsync()`.
 *
 * Entities are static: providers are created from them before any factory
 * runs. Only the module options come from `useFactory`.
 */
export interface RepositoryRootAsyncOptions<
  Drivers extends readonly RepositoryDriverInterface[],
> extends RepositoryRootRegistrationOptions<Drivers> {
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

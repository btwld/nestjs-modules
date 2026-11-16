import { type InjectionToken, type ModuleMetadata } from '@nestjs/common';

import { type RepositoryModuleOptionsInterface } from './repository-module-options.interface.js';
import { type RepositoryAdapterInterface } from './repository-module.interface.js';

/**
 * One adapter, the entities it serves, and its own options.
 *
 * `entities` and `options` are checked against the adapter's own types, so a
 * misspelled option, or one only another adapter understands, does not
 * compile.
 */
export interface RepositoryAdapterRegistration<
  Adapter extends RepositoryAdapterInterface = RepositoryAdapterInterface,
> {
  /**
   * The adapter's module class.
   */
  adapter: Adapter;

  /**
   * Entity registrations served by this adapter.
   */
  entities: NoInfer<RepositoryAdapterEntityOptions<Adapter>>[];

  /**
   * The adapter's own options, for everything it serves.
   */
  options?: NoInfer<RepositoryAdapterOptions<Adapter>>;
}

/**
 * The entity options an adapter accepts.
 */
export type RepositoryAdapterEntityOptions<
  Adapter extends RepositoryAdapterInterface,
> = Parameters<Adapter['register']>[0][number];

/**
 * The adapter-level options an adapter accepts; `undefined` when it takes none.
 */
export type RepositoryAdapterOptions<
  Adapter extends RepositoryAdapterInterface,
> = Parameters<Adapter['register']>[1];

/**
 * One {@link RepositoryAdapterRegistration} per element of `Adapters`, each typed
 * by its own adapter.
 */
export type RepositoryAdapterRegistrations<
  Adapters extends readonly RepositoryAdapterInterface[],
> = {
  [K in keyof Adapters]: RepositoryAdapterRegistration<Adapters[K]>;
};

/**
 * What `RepositoryModule.forRoot()` and `forRootAsync()` share: every entity
 * the application registers, and the modules its row scope resolvers come
 * from.
 */
export interface RepositoryRootRegistrationOptions<
  Adapters extends readonly RepositoryAdapterInterface[],
> {
  /**
   * Every entity in the application, grouped by the adapter that serves it.
   */
  adapters?: [...RepositoryAdapterRegistrations<Adapters>];

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
  Adapters extends readonly RepositoryAdapterInterface[],
> = RepositoryRootRegistrationOptions<Adapters> &
  RepositoryModuleOptionsInterface;

/**
 * Options for `RepositoryModule.forRootAsync()`.
 *
 * Entities are static: providers are created from them before any factory
 * runs. Only the module options come from `useFactory`.
 */
export interface RepositoryRootAsyncOptions<
  Adapters extends readonly RepositoryAdapterInterface[],
> extends RepositoryRootRegistrationOptions<Adapters> {
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

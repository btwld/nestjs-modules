import {
  type INestApplicationContext,
  type ModuleMetadata,
  type Type,
} from '@nestjs/common';

import { type RepositoryDriverInterface } from '../../interfaces/repository-module.interface.js';
import {
  type RepositoryDriverEntityOptions,
  type RepositoryDriverOptions,
} from '../../interfaces/repository-root-options.interface.js';

import { type ConformanceCapabilitiesInterface } from './conformance-capabilities.interface.js';
import { type ConformanceFixturesInterface } from './conformance-fixtures.interface.js';

/**
 * How a driver registers one fixture: its own entity options, with an
 * entity of the fixture's shape.
 */
export type ConformanceFixtureBinding<
  Driver extends RepositoryDriverInterface,
  Shape,
> = RepositoryDriverEntityOptions<Driver> & {
  key: string;
  entity: Type<Shape>;
};

/**
 * One binding per fixture key. `bookWithEagerAuthor` must opt in to eager
 * results, whether or not the driver supports them.
 */
export type ConformanceFixtureBindings<
  Driver extends RepositoryDriverInterface,
> = {
  [Key in keyof ConformanceFixturesInterface]: ConformanceFixtureBinding<
    Driver,
    ConformanceFixturesInterface[Key]
  >;
} & {
  bookWithEagerAuthor: { allowEagerRelations: true };
};

/**
 * What a driver gives the conformance suite to run against one database.
 */
export interface ConformanceHarnessInterface<
  Driver extends RepositoryDriverInterface,
> {
  /** Names the run, e.g. `'my-driver/postgres'`. */
  name: string;

  /** The driver's module class. */
  driver: Driver;

  /** The driver's own options, as given on its registration. */
  driverOptions?: RepositoryDriverOptions<Driver>;

  /** Modules the driver needs, such as the database connection. */
  imports?: ModuleMetadata['imports'];

  /** The driver's entity for every fixture key. */
  fixtures: ConformanceFixtureBindings<Driver>;

  /** The optional capabilities the driver provides. */
  capabilities: ConformanceCapabilitiesInterface;

  /** Empty every fixture's rows. Runs before each case. */
  reset(app: INestApplicationContext): Promise<void>;

  /**
   * Link a book to a tag through the driver's many-to-many junction. A
   * repository refuses many-to-many writes, so seeding goes around it.
   * Needed only when the driver supports `relations`.
   */
  linkBookTag?(
    app: INestApplicationContext,
    link: { bookId: string; tagId: string },
  ): Promise<void>;
}

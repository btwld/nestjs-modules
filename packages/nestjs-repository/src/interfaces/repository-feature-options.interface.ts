import { type ModuleMetadata } from '@nestjs/common';

import { type RepositoryModuleInterface } from './repository-module.interface.js';
import { type RepositoryProviderOptions } from './repository-provider-options.interface.js';

/**
 * Feature module options for RepositoryModule.forFeature()
 */
export interface RepositoryFeatureOptions {
  /**
   * Repository module class with static forFeature method.
   * e.g., TypeOrmRepositoryModule
   */
  module: RepositoryModuleInterface;

  /**
   * Entity registrations.
   */
  entities: RepositoryProviderOptions[];

  /**
   * Modules exporting providers this registration needs to resolve.
   *
   * Required when an entity declares a row scope resolver: the resolver is
   * bound inside the module this returns, which cannot see providers from the
   * module that imports it.
   */
  imports?: ModuleMetadata['imports'];
}

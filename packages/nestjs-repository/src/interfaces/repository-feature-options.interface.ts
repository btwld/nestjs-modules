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
}

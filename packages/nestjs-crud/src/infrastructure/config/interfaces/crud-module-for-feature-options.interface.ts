import { type PlainLiteralObject } from '@nestjs/common';

import { type ConfigurableCrudOptions } from '../../utils/interfaces/configurable-crud-options.interface.js';

import { type CrudModuleOptionsInterface } from './crud-module-options.interface.js';

/**
 * Configuration options for a single CRUD feature registration.
 */
export type CrudForFeatureOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> = ConfigurableCrudOptions<Entity>;

/**
 * Options for CrudModule.forFeature.
 * Configures a single CRUD endpoint with full type safety.
 */
export interface CrudModuleForFeatureOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends CrudModuleOptionsInterface {
  /**
   * CRUD configuration for a single entity type.
   */
  crud: CrudForFeatureOptionsInterface<Entity>;
}

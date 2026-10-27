import { type Provider, type Type } from '@nestjs/common';

/**
 * Map of classes by name for runtime access.
 */
export interface ConfigurableCrudClassesMap {
  [className: string]: Type;
}

/**
 * Result from ConfigurableCrudBuilder.build().
 *
 * Contains categorized maps of generated classes, accessible by their
 * generated names via destructuring.
 */
export interface ConfigurableCrudHost {
  /**
   * All providers needed for the module (adapter, handlers).
   */
  providers: Provider[];
  /**
   * Controller classes by name.
   */
  controllers: ConfigurableCrudClassesMap;
  /**
   * Query classes by name (for read operations).
   */
  queries: ConfigurableCrudClassesMap;
  /**
   * Query handler classes by name.
   */
  queryHandlers: ConfigurableCrudClassesMap;
  /**
   * Command classes by name (for write operations).
   */
  commands: ConfigurableCrudClassesMap;
  /**
   * Command handler classes by name.
   */
  commandHandlers: ConfigurableCrudClassesMap;
  /**
   * Adapter classes by name.
   */
  adapters: ConfigurableCrudClassesMap;
}

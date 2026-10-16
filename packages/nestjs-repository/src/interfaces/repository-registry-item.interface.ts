import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../repository/interfaces/repository.interface.js';

/**
 * Item stored in the repository registry.
 */
export interface RepositoryRegistryItem {
  /**
   * String key used as injection token.
   */
  readonly key: string;

  /**
   * Entity name, as the repository reports it.
   */
  readonly entityName: string;

  /**
   * URN of the rows the entity reads, as its repository reports it.
   */
  readonly urn: string;

  /**
   * The bound repository.
   */
  readonly adapter: RepositoryInterface<PlainLiteralObject>;
}

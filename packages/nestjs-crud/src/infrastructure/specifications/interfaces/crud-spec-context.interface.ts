import { type Operation } from '@concepta/nestjs-core';

import { type CrudActionCategory } from './crud-action-category.type.js';

/**
 * Minimal context interface for domain specifications.
 *
 * Domain specifications only need action and operation to evaluate
 * business rules. The full CrudContextInterface (infrastructure)
 * extends this interface, so it satisfies the specification contract.
 */
export interface CrudSpecContextInterface {
  operation: Operation;
  /** The operation's category for hooks, not an authority's action. */
  action: CrudActionCategory;
}

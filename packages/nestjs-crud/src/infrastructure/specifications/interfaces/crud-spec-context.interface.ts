import { type ActionEnum, type Operation } from '@concepta/nestjs-core';

/**
 * Minimal context interface for domain specifications.
 *
 * Domain specifications only need action and operation to evaluate
 * business rules. The full CrudContextInterface (infrastructure)
 * extends this interface, so it satisfies the specification contract.
 */
export interface CrudSpecContextInterface {
  operation: Operation;
  action: ActionEnum;
}

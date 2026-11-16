import { type Operation, CompositeSpecification } from '@concepta/nestjs-core';

import { type CrudSpecContextInterface } from './interfaces/crud-spec-context.interface.js';

/**
 * Specification that matches specific CRUD operations.
 *
 * @example
 * ```typescript
 * // Match single operation
 * CrudSpec.operation(Operation.Create)
 *
 * // Match multiple operations
 * CrudSpec.operation(Operation.Create, Operation.Update)
 *
 * // Using shortcut
 * CrudSpec.isQuery() // List, Read
 * CrudSpec.isWrite() // Create, CreateBatch, Update, Replace
 * ```
 */
export class OperationSpecification extends CompositeSpecification<CrudSpecContextInterface> {
  constructor(private readonly operations: Operation[]) {
    super();
  }

  isSatisfiedBy(context: CrudSpecContextInterface): boolean {
    return this.operations.includes(context.operation);
  }
}

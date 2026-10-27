import {
  ActionEnum,
  MutateOperations,
  type Operation,
  ReadOperations,
  type SpecificationInterface,
  WriteOperations,
  Spec,
} from '@concepta/nestjs-core';

import { ActionSpecification } from './action.specification.js';
import { type CrudSpecContextInterface } from './interfaces/crud-spec-context.interface.js';
import { OperationSpecification } from './operation.specification.js';

/**
 * Factory for creating CRUD-specific specifications.
 *
 * Extends the base Spec factory with CRUD operation and action matchers.
 *
 * @example
 * ```typescript
 * // Base specifications (from Spec)
 * CrudSpec.always()
 * CrudSpec.never()
 *
 * // CRUD-specific specifications
 * CrudSpec.isCreate()
 * CrudSpec.operation(Operation.Create)
 *
 * // Composed specifications
 * CrudSpec.and(CrudSpec.isCreate(), CrudSpec.isQuery())
 * ```
 */
export const CrudSpec = {
  // Inherit base specifications
  ...Spec,

  /**
   * Match specific CRUD operations.
   *
   * @param operations - One or more operations to match
   */
  operation: (
    ...operations: Operation[]
  ): SpecificationInterface<CrudSpecContextInterface> =>
    new OperationSpecification(operations),

  /**
   * Match specific actions.
   *
   * @param actions - One or more actions to match
   */
  action: (
    ...actions: ActionEnum[]
  ): SpecificationInterface<CrudSpecContextInterface> =>
    new ActionSpecification(actions),

  // ═══════════════════════════════════════════════════════════════════
  // Action Shortcuts
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Match CREATE action.
   */
  isCreate: (): SpecificationInterface<CrudSpecContextInterface> =>
    new ActionSpecification([ActionEnum.CREATE]),

  /**
   * Match READ action.
   */
  isRead: (): SpecificationInterface<CrudSpecContextInterface> =>
    new ActionSpecification([ActionEnum.READ]),

  /**
   * Match UPDATE action.
   */
  isUpdate: (): SpecificationInterface<CrudSpecContextInterface> =>
    new ActionSpecification([ActionEnum.UPDATE]),

  /**
   * Match DELETE action.
   */
  isDelete: (): SpecificationInterface<CrudSpecContextInterface> =>
    new ActionSpecification([ActionEnum.DELETE]),

  // ═══════════════════════════════════════════════════════════════════
  // Operation Group Shortcuts
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Match query operations (List, Read).
   * These operations read data without modification.
   */
  isQuery: (): SpecificationInterface<CrudSpecContextInterface> =>
    new OperationSpecification([...ReadOperations]),

  /**
   * Match write operations (Create, CreateBatch, Update, Replace).
   * These operations modify data but don't delete.
   */
  isWrite: (): SpecificationInterface<CrudSpecContextInterface> =>
    new OperationSpecification([...WriteOperations]),

  /**
   * Match all mutation operations (write + delete + restore).
   * Any operation that changes state.
   */
  isMutation: (): SpecificationInterface<CrudSpecContextInterface> =>
    new OperationSpecification([...MutateOperations]),
};

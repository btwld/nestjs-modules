import { type ActionEnum, CompositeSpecification } from '@concepta/nestjs-core';

import { type CrudSpecContextInterface } from './interfaces/crud-spec-context.interface.js';

/**
 * Specification that matches specific actions.
 *
 * Actions are high-level categories (CREATE, READ, UPDATE, DELETE)
 * that group related CRUD operations.
 *
 * @example
 * ```typescript
 * // Match single action
 * CrudSpec.action(ActionEnum.CREATE)
 *
 * // Match multiple actions
 * CrudSpec.action(ActionEnum.UPDATE, ActionEnum.DELETE)
 *
 * // Using shortcuts
 * CrudSpec.isCreate()
 * CrudSpec.isRead()
 * CrudSpec.isUpdate()
 * CrudSpec.isDelete()
 * ```
 */
export class ActionSpecification extends CompositeSpecification<CrudSpecContextInterface> {
  constructor(private readonly actions: ActionEnum[]) {
    super();
  }

  isSatisfiedBy(context: CrudSpecContextInterface): boolean {
    return this.actions.includes(context.action);
  }
}

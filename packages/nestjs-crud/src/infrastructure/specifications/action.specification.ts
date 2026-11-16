import { CompositeSpecification } from '@concepta/nestjs-core';

import { type CrudActionCategory } from './interfaces/crud-action-category.type.js';
import { type CrudSpecContextInterface } from './interfaces/crud-spec-context.interface.js';

/**
 * Specification that matches specific actions.
 *
 * Actions are high-level categories (CREATE, READ, UPDATE, DELETE)
 * that group related CRUD operations: soft delete counts as DELETE and
 * restore as UPDATE. Match `operation` to tell them apart.
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
  constructor(private readonly actions: CrudActionCategory[]) {
    super();
  }

  isSatisfiedBy(context: CrudSpecContextInterface): boolean {
    return this.actions.includes(context.action);
  }
}

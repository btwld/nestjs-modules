import { type ReferenceId } from '../../reference/interfaces/reference.types.js';

/**
 * Assigned to assignee.
 */
export interface AssigneeRelationInterface<
  T extends ReferenceId = ReferenceId,
> {
  assigneeId: T;
}

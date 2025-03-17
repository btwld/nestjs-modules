import {
  ReferenceAssigneeInterface,
  ReferenceAssignment,
  ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface RoleAssignmentContext<T extends ReferenceIdInterface>
  extends ReferenceAssigneeInterface<T> {
  assignment: ReferenceAssignment;
}

import { type ReferenceAssignment } from './reference.types';

/**
 * Identifiable by assignment.
 */
export interface ReferenceAssignmentInterface<
  T extends ReferenceAssignment = ReferenceAssignment,
> {
  assignment: T;
}

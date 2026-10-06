import { type ReferenceId } from '@concepta/nestjs-core';

/**
 * Belongs to user.
 */
export interface UserRelationInterface<T extends ReferenceId = ReferenceId> {
  userId: T;
}

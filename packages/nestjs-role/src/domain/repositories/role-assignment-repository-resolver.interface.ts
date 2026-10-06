import { type RoleAssignmentRepositoryInterface } from './role-assignment-repository.interface.js';

export interface RoleAssignmentRepositoryResolverInterface {
  resolve(entityKey: string): RoleAssignmentRepositoryInterface;
}

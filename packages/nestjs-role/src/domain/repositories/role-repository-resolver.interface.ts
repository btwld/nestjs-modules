import { type RoleRepositoryInterface } from './role-repository.interface.js';

export interface RoleRepositoryResolverInterface {
  resolve(entityKey: string): RoleRepositoryInterface;
}

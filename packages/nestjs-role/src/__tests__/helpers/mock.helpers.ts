import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import {
  createTestEventContext,
  createMockCommandBus,
  createMockEventPublisher,
  createMockQueryBus,
} from '@concepta/nestjs-core/testing';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type RoleAssignmentEntityInterface } from '../../domain/interfaces/role-assignment-entity.interface.js';
import { type RoleEntityInterface } from '../../domain/interfaces/role-entity.interface.js';
import { type RoleAssignmentRepositoryResolver } from '../../infrastructure/persistence/role-assignment-repository.resolver.js';
import { RoleAssignmentMapper } from '../../infrastructure/persistence/role-assignment.mapper.js';
import { type RoleAssignmentRepository } from '../../infrastructure/persistence/role-assignment.repository.js';
import { type RoleRepositoryResolver } from '../../infrastructure/persistence/role-repository.resolver.js';
import { RoleMapper } from '../../infrastructure/persistence/role.mapper.js';
import { type RoleRepository } from '../../infrastructure/persistence/role.repository.js';

export const DEFAULT_ROLE_NAMESPACE = 'Role';

export {
  createMockCommandBus,
  createMockEventPublisher,
  createMockQueryBus,
  createMockTransaction,
};
export type { MockTransactionHandle } from '@concepta/nestjs-repository/testing';

export function createMockRoleRepository(): DeepMockProxy<RoleRepository> {
  return mockDeep<RoleRepository>();
}

export function createMockRoleAssignmentRepository(): DeepMockProxy<RoleAssignmentRepository> {
  return mockDeep<RoleAssignmentRepository>();
}

export function createMockRoleRepositoryResolver(
  repo: RoleRepository,
): DeepMockProxy<RoleRepositoryResolver> {
  const resolver = mockDeep<RoleRepositoryResolver>();
  resolver.resolve.mockReturnValue(repo);
  return resolver;
}

export function createMockAssignmentRepositoryResolver(
  repo: RoleAssignmentRepository,
): DeepMockProxy<RoleAssignmentRepositoryResolver> {
  const resolver = mockDeep<RoleAssignmentRepositoryResolver>();
  resolver.resolve.mockReturnValue(repo);
  return resolver;
}

export function createMockEventContext(namespace = DEFAULT_ROLE_NAMESPACE) {
  return createTestEventContext({ namespace }, {});
}

export function createMockRoleEntity(
  overrides: Partial<RoleEntityInterface> = {},
): RoleEntityInterface {
  return {
    id: 'test-role-id',
    name: 'Test Role',
    description: 'A test role',
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

export function createMockRoleAssignmentEntity(
  overrides: Partial<RoleAssignmentEntityInterface> = {},
): RoleAssignmentEntityInterface {
  return {
    id: 'test-assignment-id',
    roleId: 'test-role-id',
    assigneeId: 'test-assignee-id',
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const roleMapper = new RoleMapper();
const roleAssignmentMapper = new RoleAssignmentMapper();

export function toRoleDomain(entity: RoleEntityInterface) {
  return roleMapper.toDomain(entity);
}

export function toRoleAssignmentDomain(entity: RoleAssignmentEntityInterface) {
  return roleAssignmentMapper.toDomain(entity);
}

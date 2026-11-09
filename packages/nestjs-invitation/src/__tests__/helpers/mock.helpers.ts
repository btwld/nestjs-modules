import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import {
  createMockCommandBus,
  createMockEventPublisher,
} from '@concepta/nestjs-core/testing';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type Invitation } from '../../domain/aggregates/invitation.js';
import { type InvitationService } from '../../domain/services/invitation.service.js';
import { type InvitationEntityInterface } from '../../infrastructure/persistence/interfaces/invitation-entity.interface.js';
import { InvitationMapper } from '../../infrastructure/persistence/invitation.mapper.js';
import { type InvitationRepository } from '../../infrastructure/persistence/invitation.repository.js';

export {
  createMockCommandBus,
  createMockEventPublisher,
  createMockTransaction,
};
export type { MockTransactionHandle } from '@concepta/nestjs-repository/testing';

export function createMockInvitationService(): DeepMockProxy<InvitationService> {
  return mockDeep<InvitationService>();
}

export function createMockInvitationRepository(): DeepMockProxy<InvitationRepository> {
  return mockDeep<InvitationRepository>();
}

export function createMockInvitationEntity(
  overrides: Partial<InvitationEntityInterface> = {},
): InvitationEntityInterface {
  return {
    id: 'test-id',
    code: 'test-code',
    category: 'user',
    userId: 'test-user-id',
    active: true,
    constraints: undefined,
    dateAccepted: null,
    dateRevoked: null,
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const invitationMapper = new InvitationMapper();

export function toInvitationDomain(
  entity: InvitationEntityInterface,
): Invitation {
  return invitationMapper.toDomain(entity);
}

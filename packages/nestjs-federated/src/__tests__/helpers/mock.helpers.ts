import { mock } from 'vitest-mock-extended';

import {
  createMockCommandBus,
  createMockEventPublisher,
} from '@concepta/nestjs-core/testing';
import { createMockTransaction } from '@concepta/nestjs-repository/testing';

import { type Identity } from '../../domain/aggregates/identity.js';
import { type FederatedUserPort } from '../../domain/ports/federated-user.port.js';
import { type FederatedOAuthService } from '../../domain/services/federated-oauth.service.js';
import { IdentityMapper } from '../../infrastructure/persistence/identity.mapper.js';
import { type IdentityRepository } from '../../infrastructure/persistence/identity.repository.js';
import { type IdentityEntityInterface } from '../../infrastructure/persistence/interfaces/identity-entity.interface.js';

export {
  createMockCommandBus,
  createMockEventPublisher,
  createMockTransaction,
};
export type { MockTransactionHandle } from '@concepta/nestjs-repository/testing';

export function createMockIdentityRepository() {
  return mock<IdentityRepository>();
}

export function createMockFederatedUserPort() {
  return mock<FederatedUserPort>();
}

export function createMockFederatedOAuthService() {
  return mock<FederatedOAuthService>();
}

export function createMockIdentityEntity(
  overrides: Record<string, unknown> = {},
): IdentityEntityInterface {
  return {
    id: 'identity-id',
    provider: 'google',
    subject: 'subject-id',
    user: { id: 'user-id' },
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const identityMapper = new IdentityMapper();

export function toIdentityDomain(entity: IdentityEntityInterface): Identity {
  return identityMapper.toDomain(entity);
}

import { type Mocked } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type EventPublisher } from '@nestjs/cqrs';

import { AppContextHost } from '@concepta/nestjs-core';
import {
  TrxCtx,
  type TransactionScope,
  type TransactionContextInterface,
} from '@concepta/nestjs-repository';

import { type UserCredentials } from '../../domain/aggregates/user-credentials.js';
import { type User } from '../../domain/aggregates/user.js';
import { type UserCredentialEntityInterface } from '../../domain/interfaces/user-credential-entity.interface.js';
import { type UserEntityInterface } from '../../domain/interfaces/user-entity.interface.js';
import { type UserPasswordPort } from '../../domain/ports/user-password.port.js';
import { type UserCredentialsRepositoryInterface } from '../../domain/repositories/user-credentials-repository.interface.js';
import { type UserRepositoryInterface } from '../../domain/repositories/user-repository.interface.js';
import { type UserCredentialsService } from '../../domain/services/user-credentials.service.js';
import { UserCredentialsMapper } from '../../infrastructure/persistence/user-credentials.mapper.js';
import { UserMapper } from '../../infrastructure/persistence/user.mapper.js';

export function createMockTxScope(): DeepMockProxy<TransactionScope> {
  const trxHandle = {
    onCommit: vi.fn(),
    onRollback: vi.fn(),
  };

  const mockHost = new AppContextHost();
  mockHost.defineOverlay(TrxCtx, {
    trx: trxHandle,
  } as unknown as TransactionContextInterface);
  const mockTxCtx = mockHost.with(TrxCtx);

  const txScope = mockDeep<TransactionScope>();
  txScope.run.mockImplementation((_ctx, fn) => fn(mockTxCtx));

  return txScope;
}

export function createMockEventPublisher(): DeepMockProxy<EventPublisher> {
  const publisher = mockDeep<EventPublisher>();
  publisher.mergeObjectContext.mockImplementation((obj) => {
    obj.commit = vi.fn();
    obj.uncommit = vi.fn();
    return obj;
  });
  return publisher;
}

export function createMockUserRepository(): Mocked<UserRepositoryInterface> {
  return {
    get: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
}

export function createMockUserCredentialsRepository(): Mocked<UserCredentialsRepositoryInterface> {
  return {
    findActiveByUserId: vi.fn(),
    findByUserId: vi.fn(),
    save: vi.fn(),
  };
}

export function createMockPasswordPort(): DeepMockProxy<UserPasswordPort> {
  return mockDeep<UserPasswordPort>();
}

export function createMockUserCredentialsService(): DeepMockProxy<UserCredentialsService> {
  return mockDeep<UserCredentialsService>();
}

export function createMockUserEntity(
  overrides: Partial<UserEntityInterface> = {},
): UserEntityInterface {
  return {
    id: 'user-1',
    email: 'a@b.com',
    username: 'john',
    active: true,
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

export function createMockUserCredentialEntity(
  overrides: Partial<UserCredentialEntityInterface> = {},
): UserCredentialEntityInterface {
  return {
    id: 'cred-1',
    userId: 'user-1',
    passwordHash: 'old-hash',
    active: true,
    validFrom: new Date('2026-01-01'),
    validTo: null,
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
    ...overrides,
  };
}

const userMapper = new UserMapper();
const credentialsMapper = new UserCredentialsMapper();

export function toUserDomain(entity: UserEntityInterface): User {
  return userMapper.toDomain(entity);
}

export function toUserCredentialsDomain(
  entity: UserCredentialEntityInterface,
): UserCredentials {
  return credentialsMapper.toDomain(entity);
}

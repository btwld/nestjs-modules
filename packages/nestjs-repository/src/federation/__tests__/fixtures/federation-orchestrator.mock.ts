import { vi, type Mocked, type Mock } from 'vitest';

import { type PlainLiteralObject } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';

import { type RepositoryRelationMetadataInterface } from '../../../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryInterface } from '../../../repository/interfaces/repository.interface.js';
import { RepositoryRegistryService } from '../../../services/repository-registry.service.js';
import { createMockRepository } from '../../../testing/create-mock-repository.js';
import { getDynamicRepositoryToken } from '../../../utils/get-dynamic-repository-token.js';
import { FederationOrchestrator } from '../../federation-orchestrator.service.js';
import { type FederatedRelation } from '../../federation.types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type MockRepo<T extends PlainLiteralObject = PlainLiteralObject> =
  Mocked<RepositoryInterface<T>>;

export interface TestRoot {
  id: number;
  name: string;
  profileId?: number | null;
  blogId?: number | null;
  [key: string]: unknown;
}

export interface TestRelation {
  id: number;
  userId: number;
  title?: string;
  published?: boolean;
  [key: string]: unknown;
}

export interface TestProfile {
  id: number;
  userId: number;
  bio?: string;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// Test repository factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a mock repository with standard metadata for testing.
 *
 * @param entityName - Name of the entity for metadata
 * @param options - Optional overrides for columns, relations, etc.
 */
export function mockTestRepo<T extends PlainLiteralObject = PlainLiteralObject>(
  entityName: string,
  options: {
    primaryKey?: string;
    relations?: RepositoryRelationMetadataInterface[];
  } = {},
): MockRepo<T> {
  const { primaryKey = 'id', relations } = options;

  return createMockRepository<T>({
    name: entityName,
    columns: [
      {
        name: primaryKey,
        isPrimary: true,
        isRemoveDate: false,
        isVersion: false,
      },
    ],
    relations,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestrator factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a FederationOrchestrator wired to mock peer repositories.
 *
 * @param peerRepos - Map of entity name to mock repository
 * @returns Object with orchestrator and mock references
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mockOrchestrator(peerRepos: Record<string, MockRepo<any>>): {
  orchestrator: FederationOrchestrator;
  registry: RepositoryRegistryService;
  moduleRef: { get: Mock };
} {
  const registry = new RepositoryRegistryService();

  // Register and bootstrap each peer repository
  for (const entityName of Object.keys(peerRepos)) {
    registry.register({
      key: entityName,
      entityName,
      moduleName: 'TestModule',
    });
  }
  registry.onApplicationBootstrap();

  // Mock ModuleRef.get to resolve peer repos by dynamic token
  const moduleRef = {
    get: vi.fn((token: string) => {
      for (const [entityName, repo] of Object.entries(peerRepos)) {
        if (token === getDynamicRepositoryToken(entityName)) {
          return repo;
        }
      }
      throw new Error(`No mock repo for token: ${token}`);
    }),
  };

  const orchestrator = new FederationOrchestrator(
    registry,
    moduleRef as unknown as ModuleRef,
  );

  return { orchestrator, registry, moduleRef };
}

// ═══════════════════════════════════════════════════════════════════════════
// Context factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a minimal context for testing.
 */
export function mockContext(
  overrides: PlainLiteralObject = {},
): PlainLiteralObject {
  return {
    hooks: [],
    entity: 'TestEntity',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Relation builders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a non-owning one-to-many federated relation metadata entry.
 *
 * Non-owning: root PK (on.from = 'id') \> target FK (on.to = e.g. 'userId')
 */
export function mockOneToManyRelation(
  name: string,
  targetEntity: string,
  overrides: Partial<RepositoryRelationMetadataInterface> = {},
): RepositoryRelationMetadataInterface {
  return {
    name,
    targetEntity,
    cardinality: 'many',
    on: { from: 'id', to: 'userId' },
    federated: true,
    ...overrides,
  };
}

/**
 * Build a non-owning one-to-one federated relation metadata entry.
 *
 * Non-owning: root PK (on.from = 'id') \> target FK (on.to = e.g. 'userId')
 */
export function mockOneToOneRelation(
  name: string,
  targetEntity: string,
  overrides: Partial<RepositoryRelationMetadataInterface> = {},
): RepositoryRelationMetadataInterface {
  return {
    name,
    targetEntity,
    cardinality: 'one',
    on: { from: 'id', to: 'userId' },
    federated: true,
    ...overrides,
  };
}

/**
 * Build an owning one-to-one federated relation metadata entry.
 *
 * Owning: root FK (on.from = e.g. 'blogId') \> target PK (on.to = 'id')
 */
export function mockOwningOneToOneRelation(
  name: string,
  targetEntity: string,
  rootFK: string,
  targetPK = 'id',
): RepositoryRelationMetadataInterface {
  return {
    name,
    targetEntity,
    cardinality: 'one',
    on: { from: rootFK, to: targetPK },
    federated: true,
  };
}

/**
 * Convert a RepositoryRelationMetadataInterface to a FederatedRelation
 * with computed isOwning and joinType fields.
 */
export function mockFederatedRelation(
  rel: RepositoryRelationMetadataInterface,
  rootPrimaryKeys: string[] = ['id'],
  joinType: 'LEFT' | 'INNER' = 'LEFT',
): FederatedRelation {
  return {
    ...rel,
    isOwning: !rootPrimaryKeys.includes(rel.on.from),
    joinType,
  };
}

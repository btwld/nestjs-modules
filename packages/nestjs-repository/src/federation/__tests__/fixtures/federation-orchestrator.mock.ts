import { type Mocked } from 'vitest';

import { type PlainLiteralObject } from '@nestjs/common';

import { targetColumnsFixture } from '../../../__fixtures__/column-metadata.fixture.js';
import { type RepositoryRelationMetadataInterface } from '../../../repository/interfaces/repository-relation-metadata.interface.js';
import { type RepositoryInterface } from '../../../repository/interfaces/repository.interface.js';
import { RepositoryRegistryService } from '../../../services/repository-registry.service.js';
import { createMockRepository } from '../../../testing/create-mock-repository.js';
import { FederationOrchestrator } from '../../federation-orchestrator.service.js';

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
} {
  const registry = new RepositoryRegistryService();

  // Register each peer repository
  registry.register(
    Object.entries(peerRepos).map(([entityName, adapter]) => ({
      key: entityName,
      entityName,
      urn: `urn:mock:${entityName}`,
      adapter,
    })),
  );

  const orchestrator = new FederationOrchestrator(registry);

  return { orchestrator, registry };
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
    targetUrn: `urn:memory:${targetEntity}`,
    targetColumns: targetColumnsFixture('id', 'userId'),
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
    targetUrn: `urn:memory:${targetEntity}`,
    targetColumns: targetColumnsFixture('id', 'userId'),
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
    targetUrn: `urn:memory:${targetEntity}`,
    targetColumns: targetColumnsFixture(targetPK),
    cardinality: 'one',
    on: { from: rootFK, to: targetPK },
    federated: true,
  };
}

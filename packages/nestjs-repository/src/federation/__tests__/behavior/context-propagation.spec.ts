/**
 * Behavior tests for context propagation across federation strategies.
 *
 * Verifies that RepositoryContextInterface (trx, hooks, etc.) is forwarded
 * to every repository call — both root and peer — in ROOT_FIRST and
 * RELATION_FIRST execution paths.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/transaction-propagation.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
  mockContext,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Context Propagation', () => {
  it('should propagate ctx to relation queries in ROOT_FIRST strategy', async () => {
    // ARRANGE
    const relation = mockOneToManyRelation('comments', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
    });
    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [relation],
    });
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    const ctx = mockContext({ entity: 'TestRoot' });

    rootRepo.findAndCount.mockResolvedValue([
      [
        { id: 1, name: 'Root 1' } as TestRoot,
        { id: 2, name: 'Root 2' } as TestRoot,
      ],
      2,
    ]);
    peerRepo.findAndCount.mockResolvedValue([
      [
        { id: 1, rootId: 1, title: 'Comment A' } as TestRelation,
        { id: 2, rootId: 2, title: 'Comment B' } as TestRelation,
      ],
      2,
    ]);

    // ACT
    await orchestrator.findAndCount(rootRepo, {
      join: [{ relation: 'comments' }],
      take: 10,
      ctx,
    });

    // ASSERT - both root and peer received the same ctx reference
    expect(rootRepo.findAndCount.mock.calls[0][0]?.ctx).toBe(ctx);
    expect(peerRepo.findAndCount.mock.calls[0][0]?.ctx).toBe(ctx);
  });

  it('should propagate ctx to relation queries in RELATION_FIRST strategy', async () => {
    // ARRANGE - relation filter triggers RELATION_FIRST
    const relation = mockOneToManyRelation('comments', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
      distinctFilter: {
        field: 'isLatest',
        operator: WhereOperator.EQ,
        value: true,
      },
    });
    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [relation],
    });
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    const ctx = mockContext({ entity: 'TestRoot' });

    // Discovery phase: peer query finds matching relations
    peerRepo.findAndCount.mockResolvedValueOnce([
      [
        {
          id: 1,
          rootId: 1,
          title: 'Published A',
          status: 'published',
        } as TestRelation,
        {
          id: 2,
          rootId: 2,
          title: 'Published B',
          status: 'published',
        } as TestRelation,
      ],
      2,
    ]);

    // Constrained root fetch
    rootRepo.findAndCount.mockResolvedValue([
      [
        { id: 1, name: 'Root 1' } as TestRoot,
        { id: 2, name: 'Root 2' } as TestRoot,
      ],
      2,
    ]);

    // Hydration fetch
    peerRepo.findAndCount.mockResolvedValueOnce([
      [
        {
          id: 1,
          rootId: 1,
          title: 'Published A',
          status: 'published',
        } as TestRelation,
        {
          id: 2,
          rootId: 2,
          title: 'Published B',
          status: 'published',
        } as TestRelation,
      ],
      2,
    ]);

    // ACT
    await orchestrator.findAndCount(rootRepo, {
      where: {
        field: 'status',
        operator: WhereOperator.EQ,
        value: 'published',
        relation: 'comments',
      },
      join: [{ relation: 'comments' }],
      take: 10,
      ctx,
    });

    // ASSERT - every peer repo call (discovery + hydration) received ctx
    for (const call of peerRepo.findAndCount.mock.calls) {
      expect(call[0]?.ctx).toBe(ctx);
    }

    // Root repo calls also received ctx
    for (const call of rootRepo.findAndCount.mock.calls) {
      expect(call[0]?.ctx).toBe(ctx);
    }
  });
});

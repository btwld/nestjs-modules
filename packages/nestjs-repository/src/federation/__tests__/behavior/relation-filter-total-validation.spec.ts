/**
 * Validation test for accurate totals when filtering many-cardinality
 * relations.
 *
 * The RELATION_FIRST total is read from the driving relation's own
 * `findAndCount` total, which counts matching child rows — not distinct
 * root ids. For a many-cardinality relation, two matching child rows
 * belonging to one root would report total=2 for a single matching root.
 * `distinctFilter` is the existing mechanism (already required for
 * relation *sorts*, see relation-sort-validation.spec.ts) that narrows a
 * many relation to at most one row per root, keeping that total accurate.
 * This extends the same requirement to relation *filters*.
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { FederationException } from '../../exceptions/federation.exception.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
  mockOneToOneRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - relation filter total accuracy', () => {
  it('should throw when filtering on a many-cardinality relation without distinctFilter', async () => {
    const relation = mockOneToManyRelation('comments', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
      // No distinctFilter — the filtered total would count child rows.
    });
    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [relation],
    });
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    const error = await orchestrator
      .findAndCount(rootRepo, {
        where: {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'published',
          relation: 'comments',
        },
        join: [{ relation: 'comments' }],
        take: 10,
        skip: 0,
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(FederationException);
    expect(error.message).toContain('distinctFilter');
    expect(error.message).toContain('comments');
    expect(rootRepo.findAndCount).not.toHaveBeenCalled();
    expect(peerRepo.findAndCount).not.toHaveBeenCalled();
  });

  it('should still succeed when filtering a many-cardinality relation with distinctFilter', async () => {
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

    peerRepo.findAndCount
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            rootId: 10,
            title: 'Comment',
            status: 'published',
            isLatest: true,
          },
        ],
        1,
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            rootId: 10,
            title: 'Comment',
            status: 'published',
            isLatest: true,
          },
        ],
        1,
      ]);
    rootRepo.findAndCount.mockResolvedValue([[{ id: 10, name: 'Root 10' }], 1]);

    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      where: {
        field: 'status',
        operator: WhereOperator.EQ,
        value: 'published',
        relation: 'comments',
      },
      join: [{ relation: 'comments' }],
      take: 10,
      skip: 0,
    });

    expect(result).toHaveLength(1);
    expect(total).toBe(1);
  });

  it('should not throw for a plain INNER JOIN (no user filter) on a many-cardinality relation', async () => {
    // The auto-injected NOT_NULL for INNER JOIN is structural, not a
    // user-specified filter — it alone shouldn't demand distinctFilter.
    const relation = mockOneToManyRelation('posts', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
    });
    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [relation],
    });
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    peerRepo.findAndCount.mockResolvedValue([
      [{ id: 1, rootId: 10 }] as TestRelation[],
      1,
    ]);
    rootRepo.findAndCount.mockResolvedValue([[{ id: 10, name: 'Root 10' }], 1]);

    await expect(
      orchestrator.findAndCount(rootRepo, {
        join: [{ relation: 'posts', joinType: 'INNER' }],
        take: 10,
        skip: 0,
      }),
    ).resolves.toBeDefined();
  });

  it('should not throw when filtering a one-cardinality relation without distinctFilter', async () => {
    const relation = mockOneToOneRelation('profile', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
    });
    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [relation],
    });
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    peerRepo.findAndCount
      .mockResolvedValueOnce([[{ id: 1, rootId: 10 }] as TestRelation[], 1])
      .mockResolvedValueOnce([[{ id: 1, rootId: 10 }] as TestRelation[], 1]);
    rootRepo.findAndCount.mockResolvedValue([[{ id: 10, name: 'Root 10' }], 1]);

    await expect(
      orchestrator.findAndCount(rootRepo, {
        where: {
          field: 'bio',
          operator: WhereOperator.CONTAINS,
          value: 'x',
          relation: 'profile',
        },
        join: [{ relation: 'profile' }],
        take: 10,
        skip: 0,
      }),
    ).resolves.toBeDefined();
  });
});

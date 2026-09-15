/**
 * Behavior test for multi-relation constraint field usage.
 *
 * When processRelationChain processes multiple relations sequentially,
 * it must use the target relation's foreignKey (on.to) — not the root's
 * primary key — when constraining the second relation with IDs discovered
 * from the first.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/multi-relation-constraint.spec.ts
 */
import {
  WhereCompoundOperator,
  WhereOperator,
} from '../../../repository/repository.types.js';
import { Where } from '../../../repository/where.helpers.js';
import {
  type TestRoot,
  type TestRelation,
  type TestProfile,
} from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
  mockOneToOneRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - Multi-Relation Constraint Field', () => {
  it('should use foreignKey (not rootKey) when constraining second relation', async () => {
    // ARRANGE - Two forward relations: profiles (driving) + comments (constrained)
    const profileRelation = mockOneToOneRelation('profiles', 'TestProfile', {
      on: { from: 'id', to: 'rootId' },
    });

    const commentRelation = mockOneToManyRelation('comments', 'TestRelation', {
      on: { from: 'id', to: 'rootId' },
      distinctFilter: {
        field: 'isLatest',
        operator: WhereOperator.EQ,
        value: true,
      },
    });

    const rootRepo = mockTestRepo<TestRoot>('TestRoot', {
      relations: [profileRelation, commentRelation],
    });
    const profileRepo = mockTestRepo<TestProfile>('TestProfile');
    const commentRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({
      TestProfile: profileRepo,
      TestRelation: commentRepo,
    });

    // Profile discovery: returns root IDs [10, 20, 30]
    profileRepo.findAndCount
      .mockResolvedValueOnce([
        [
          { id: 1, rootId: 10, bio: 'A' },
          { id: 2, rootId: 20, bio: 'B' },
          { id: 3, rootId: 30, bio: 'C' },
        ] as TestProfile[],
        3,
      ])
      // Hydration
      .mockResolvedValueOnce([
        [
          { id: 1, rootId: 10, bio: 'A' },
          { id: 2, rootId: 20, bio: 'B' },
        ] as TestProfile[],
        2,
      ]);

    // Comment constrained discovery + hydration
    commentRepo.findAndCount
      .mockResolvedValueOnce([
        [
          {
            id: 101,
            rootId: 10,
            title: 'Comment A',
            status: 'published',
            isLatest: true,
          },
          {
            id: 102,
            rootId: 20,
            title: 'Comment B',
            status: 'published',
            isLatest: true,
          },
        ] as TestRelation[],
        2,
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 101,
            rootId: 10,
            title: 'Comment A',
            status: 'published',
            isLatest: true,
          },
          {
            id: 102,
            rootId: 20,
            title: 'Comment B',
            status: 'published',
            isLatest: true,
          },
        ] as TestRelation[],
        2,
      ]);

    rootRepo.findAndCount.mockResolvedValue([
      [
        { id: 10, name: 'Root 10' },
        { id: 20, name: 'Root 20' },
      ] as TestRoot[],
      2,
    ]);

    // ACT
    const [result] = await orchestrator.findAndCount(rootRepo, {
      where: Where.and(
        {
          field: 'isActive',
          operator: WhereOperator.EQ,
          value: true,
          relation: 'profiles',
        },
        {
          field: 'status',
          operator: WhereOperator.EQ,
          value: 'published',
          relation: 'comments',
        },
      ),
      join: [{ relation: 'profiles' }, { relation: 'comments' }],
      take: 5,
      skip: 0,
    });

    // ASSERT - The comment relation's constraint must use foreignKey ('rootId'),
    // not rootKey ('id').
    const commentDiscoveryCall = commentRepo.findAndCount.mock.calls[0][0];
    const whereClause = commentDiscoveryCall?.where;

    // Should be an AND compound with conditions
    expect(whereClause).toHaveProperty('operator', WhereCompoundOperator.AND);
    expect(whereClause).toHaveProperty('conditions');

    // Find the FK constraint: the condition without a `relation` tag
    // (injected by processRelationChain using relation.on.to)
    const conditions = (
      whereClause as {
        conditions: {
          field: string;
          operator: string;
          value: unknown;
          relation?: string;
        }[];
      }
    ).conditions;
    const constraintFilter = conditions.find((c) => !c.relation);
    expect(constraintFilter).toBeDefined();
    expect(constraintFilter!.field).toBe('rootId');
    expect(constraintFilter!.value).toEqual([10, 20, 30]);

    // Verify final results
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual([10, 20]);
  });
});

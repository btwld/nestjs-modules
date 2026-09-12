/**
 * Behavior test for iterative discovery pagination in RELATION_FIRST.
 *
 * When the first discovery batch doesn't surface enough unique root ids
 * (sparse relation data), BufferStrategy advances to a second batch. That
 * second batch's skip must stay relative to the caller's own `skip` —
 * `userSkip + offset` — not just the buffer's internal `offset`, or a
 * paginated request can read data from before the requested window.
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOneToManyRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - RELATION_FIRST pagination', () => {
  it('keeps the second discovery batch relative to the caller-supplied skip', async () => {
    // ARRANGE
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
    const commentRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: commentRepo });

    // First batch: 2 rows, but both belong to the same root — sparse data,
    // only 1 unique id discovered against a take of 2.
    commentRepo.findAndCount
      .mockResolvedValueOnce([
        [
          { id: 201, rootId: 10, title: 'C1', isLatest: true },
          { id: 202, rootId: 10, title: 'C2', isLatest: true },
        ] as TestRelation[],
        5,
      ])
      // Second batch: one more unique root, satisfies take=2.
      .mockResolvedValueOnce([
        [
          { id: 203, rootId: 20, title: 'C3', isLatest: true },
        ] as TestRelation[],
        5,
      ])
      // Hydration pass.
      .mockResolvedValue([[], 0]);

    rootRepo.findAndCount.mockResolvedValue([
      [
        { id: 10, name: 'Root 10' },
        { id: 20, name: 'Root 20' },
      ] as TestRoot[],
      2,
    ]);

    // ACT
    await orchestrator.findAndCount(rootRepo, {
      where: {
        field: 'status',
        operator: WhereOperator.EQ,
        value: 'active',
        relation: 'comments',
      },
      join: [{ relation: 'comments' }],
      take: 2,
      skip: 5,
    });

    // ASSERT
    const firstBatch = commentRepo.findAndCount.mock.calls[0][0];
    const secondBatch = commentRepo.findAndCount.mock.calls[1][0];

    expect(firstBatch?.skip).toBe(5);
    // Buffer offset for the second batch is 2 (batchSize == take); the
    // effective skip must stay relative to the caller's skip of 5, i.e. 7 —
    // not the bare buffer offset of 2.
    expect(secondBatch?.skip).toBe(7);
  });
});

/**
 * Behavior tests for queries without any federated relations.
 *
 * Verifies that when no federated joins are requested, the orchestrator
 * passes through to rootRepo.findAndCount unchanged.
 *
 * Ported from nestjs-crud __tests__/crud-federation/behavior/no-relations.spec.ts
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { type TestRoot, type TestRelation } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - No Relations Query', () => {
  it('should pass through root request unchanged when no joins are requested', async () => {
    // ARRANGE
    const rootRepo = mockTestRepo<TestRoot>('TestRoot');
    const { orchestrator } = mockOrchestrator({});

    const roots = [
      { id: 1, name: 'Root 1' },
      { id: 2, name: 'Root 2' },
      { id: 3, name: 'Root 3' },
    ] as TestRoot[];

    rootRepo.findAndCount.mockResolvedValue([roots, 3]);

    // ACT
    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      take: 10,
      skip: 0,
    });

    // ASSERT
    expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(total).toBe(3);
  });

  it('should preserve root filters when no joins are requested', async () => {
    // ARRANGE
    const rootRepo = mockTestRepo<TestRoot>('TestRoot');
    const { orchestrator } = mockOrchestrator({});

    const filteredRoots = [{ id: 1, name: 'test' }] as TestRoot[];
    rootRepo.findAndCount.mockResolvedValue([filteredRoots, 1]);

    // ACT
    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      where: {
        field: 'name',
        operator: WhereOperator.EQ,
        value: 'test',
      },
      take: 10,
      skip: 0,
    });

    // ASSERT
    expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    const callOptions = rootRepo.findAndCount.mock.calls[0][0];
    expect(callOptions?.where).toEqual({
      field: 'name',
      operator: WhereOperator.EQ,
      value: 'test',
    });
    expect(result).toHaveLength(1);
    expect(total).toBe(1);
    expect(result[0]).toEqual({ id: 1, name: 'test' });
  });

  it('should preserve root sorting when no joins are requested', async () => {
    // ARRANGE
    const rootRepo = mockTestRepo<TestRoot>('TestRoot');
    const { orchestrator } = mockOrchestrator({});

    const sortedRoots = [
      { id: 3, name: 'Root A' },
      { id: 1, name: 'Root B' },
      { id: 2, name: 'Root C' },
    ] as TestRoot[];

    rootRepo.findAndCount.mockResolvedValue([sortedRoots, 3]);

    // ACT
    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      order: [{ field: 'name', order: 'ASC' }],
      take: 10,
      skip: 0,
    });

    // ASSERT
    expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    const callOptions = rootRepo.findAndCount.mock.calls[0][0];
    expect(callOptions?.order).toEqual([{ field: 'name', order: 'ASC' }]);
    expect(result).toHaveLength(3);
    expect(total).toBe(3);
    expect(result.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it('should handle empty root results with no joins', async () => {
    // ARRANGE
    const rootRepo = mockTestRepo<TestRoot>('TestRoot');
    const { orchestrator } = mockOrchestrator({});

    rootRepo.findAndCount.mockResolvedValue([[], 0]);

    // ACT
    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      take: 10,
      skip: 0,
    });

    // ASSERT
    expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
    expect(total).toBe(0);
  });

  it('should not call any peer repo when no federated joins exist', async () => {
    // ARRANGE - Repo has relations in metadata but no joins requested
    const rootRepo = mockTestRepo<TestRoot>('TestRoot');
    const peerRepo = mockTestRepo<TestRelation>('TestRelation');
    const { orchestrator } = mockOrchestrator({ TestRelation: peerRepo });

    const roots = [
      { id: 1, name: 'Root 1' },
      { id: 2, name: 'Root 2' },
    ] as TestRoot[];

    rootRepo.findAndCount.mockResolvedValue([roots, 2]);

    // ACT — no join in options
    const [result, total] = await orchestrator.findAndCount(rootRepo, {
      take: 10,
      skip: 0,
    });

    // ASSERT — peer repo never called
    expect(rootRepo.findAndCount).toHaveBeenCalledTimes(1);
    expect(peerRepo.findAndCount).toHaveBeenCalledTimes(0);
    expect(result).toHaveLength(2);
    expect(total).toBe(2);
  });
});

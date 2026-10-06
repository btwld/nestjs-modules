/**
 * Validation tests for filtering/sorting on owning federated relations.
 *
 * RELATION_FIRST discovery can only extract root ids from non-owning
 * relations (target FK -> root PK). An owning relation (root FK -> target
 * PK) can't drive discovery, so filtering or sorting by one must be
 * rejected loudly rather than silently returning an empty, wrong result.
 */
import { WhereOperator } from '../../../repository/repository.types.js';
import { FederationException } from '../../exceptions/federation.exception.js';
import { type TestRoot } from '../federation-test-data.js';
import {
  mockTestRepo,
  mockOrchestrator,
  mockOwningOneToOneRelation,
} from '../fixtures/federation-orchestrator.mock.js';

describe('FederationOrchestrator - owning relation filter/sort validation', () => {
  it('should throw when filtering on an owning relation', async () => {
    const blogRelation = mockOwningOneToOneRelation(
      'blog',
      'BlogEntity',
      'blogId',
    );
    const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
      relations: [blogRelation],
    });
    const blogRepo = mockTestRepo('BlogEntity');
    const { orchestrator } = mockOrchestrator({ BlogEntity: blogRepo });

    const error = await orchestrator
      .findAndCount(rootRepo, {
        where: {
          field: 'title',
          operator: WhereOperator.EQ,
          value: 'My Blog',
          relation: 'blog',
        },
        join: [{ relation: 'blog' }],
        take: 10,
        skip: 0,
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(FederationException);
    expect(error.message).toContain('blog');
    expect(rootRepo.findAndCount).not.toHaveBeenCalled();
    expect(blogRepo.findAndCount).not.toHaveBeenCalled();
  });

  it('should throw when sorting on an owning relation', async () => {
    const blogRelation = mockOwningOneToOneRelation(
      'blog',
      'BlogEntity',
      'blogId',
    );
    const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
      relations: [blogRelation],
    });
    const blogRepo = mockTestRepo('BlogEntity');
    const { orchestrator } = mockOrchestrator({ BlogEntity: blogRepo });

    await expect(
      orchestrator.findAndCount(rootRepo, {
        order: [{ field: 'title', order: 'ASC', relation: 'blog' }],
        join: [{ relation: 'blog' }],
        take: 10,
        skip: 0,
      }),
    ).rejects.toThrow(FederationException);
  });

  it('should not throw for a plain join (no filter/sort) on an owning relation', async () => {
    const blogRelation = mockOwningOneToOneRelation(
      'blog',
      'BlogEntity',
      'blogId',
    );
    const rootRepo = mockTestRepo<TestRoot>('UserEntity', {
      relations: [blogRelation],
    });
    const blogRepo = mockTestRepo('BlogEntity');
    const { orchestrator } = mockOrchestrator({ BlogEntity: blogRepo });

    rootRepo.findAndCount.mockResolvedValue([
      [{ id: 1, name: 'Alice', blogId: 100 }],
      1,
    ]);
    blogRepo.findAndCount.mockResolvedValue([
      [{ id: 100, title: 'My Blog' }],
      1,
    ]);

    const [data] = await orchestrator.findAndCount(rootRepo, {
      join: [{ relation: 'blog' }],
    });

    expect(data[0].blog).toEqual({ id: 100, title: 'My Blog' });
  });
});

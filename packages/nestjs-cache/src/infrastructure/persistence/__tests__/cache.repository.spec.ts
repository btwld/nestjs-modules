import { AppContextHost } from '@concepta/nestjs-core';
import { Where } from '@concepta/nestjs-repository';
import { createMockRepository } from '@concepta/nestjs-repository/testing';

import { toCacheDomain } from '../../../__tests__/helpers/mock.helpers.js';
import { Cache } from '../../../domain/aggregates/cache.js';
import { CacheMapper } from '../cache.mapper.js';
import { CacheRepository } from '../cache.repository.js';
import { type CacheEntityInterface } from '../interfaces/cache-entity.interface.js';

const mapper = new CacheMapper();

const mockEntity: CacheEntityInterface = {
  id: 'test-id',
  key: 'test-key',
  type: 'test-type',
  assigneeId: 'test-assignee',
  data: 'test-data',
  expirationDate: new Date('2027-01-01'),
  dateCreated: new Date('2026-01-01'),
  dateUpdated: new Date('2026-01-01'),
  dateDeleted: null,
  version: 1,
};

describe(CacheRepository.name, () => {
  let repo: CacheRepository;
  let mockRepoInterface: ReturnType<
    typeof createMockRepository<CacheEntityInterface>
  >;
  const w = Where.for<CacheEntityInterface>();
  const ctx = new AppContextHost();

  beforeEach(() => {
    mockRepoInterface = createMockRepository<CacheEntityInterface>();
    repo = new CacheRepository(mockRepoInterface, new CacheMapper());
  });

  describe('get', () => {
    it('should query by id and return a Cache', async () => {
      mockRepoInterface.findOne.mockResolvedValue(mockEntity);

      const result = await repo.get(ctx, 'test-id');

      expect(result).toBeInstanceOf(Cache);
      expect(result!.id).toBe('test-id');
      expect(mockRepoInterface.findOne).toHaveBeenCalledWith({
        where: w.eq('id', 'test-id'),
        ctx,
      });
    });

    it('should return null when entity is not found', async () => {
      mockRepoInterface.findOne.mockResolvedValue(null);

      const result = await repo.get(ctx, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should query by key, type, and assigneeId', async () => {
      mockRepoInterface.findOne.mockResolvedValue(mockEntity);

      const result = await repo.findOne(ctx, {
        key: 'test-key',
        type: 'test-type',
        assigneeId: 'test-assignee',
      });

      expect(result).toBeInstanceOf(Cache);
      expect(result!.key).toBe('test-key');
      expect(mockRepoInterface.findOne).toHaveBeenCalledWith({
        where: w.and(
          w.eq('key', 'test-key'),
          w.eq('type', 'test-type'),
          w.eq('assigneeId', 'test-assignee'),
        ),
        ctx,
      });
    });

    it('should return null when no entity matches', async () => {
      mockRepoInterface.findOne.mockResolvedValue(null);

      const result = await repo.findOne(ctx, {
        key: 'no-match',
        type: 'no-match',
        assigneeId: 'no-match',
      });

      expect(result).toBeNull();
    });
  });

  describe('findAllByAssignee', () => {
    it('should query by assigneeId', async () => {
      mockRepoInterface.find.mockResolvedValue([mockEntity, mockEntity]);

      const result = await repo.findAllByAssignee(ctx, 'test-assignee');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Cache);
      expect(mockRepoInterface.find).toHaveBeenCalledWith({
        where: w.eq('assigneeId', 'test-assignee'),
        ctx,
      });
    });

    it('should return empty array when no matches', async () => {
      mockRepoInterface.find.mockResolvedValue([]);

      const result = await repo.findAllByAssignee(ctx, 'no-match');

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should stamp and upsert the plain entity', async () => {
      mockRepoInterface.upsert.mockResolvedValue(mockEntity);

      const cache = toCacheDomain(mockEntity);
      const stampSpy = vi.spyOn(cache, 'stampUpdated');

      await repo.save(ctx, cache);

      expect(stampSpy).toHaveBeenCalledTimes(1);
      expect(mockRepoInterface.upsert).toHaveBeenCalledWith(
        mapper.toPersistence(cache),
        { ctx },
      );
    });
  });

  describe('remove', () => {
    it('should delete the plain entity', async () => {
      mockRepoInterface.delete.mockResolvedValue(undefined as never);

      const cache = toCacheDomain(mockEntity);
      await repo.remove(ctx, cache);

      expect(mockRepoInterface.delete).toHaveBeenCalledWith(
        mapper.toPersistence(cache),
        { ctx },
      );
    });
  });

  describe('removeAllByAssignee', () => {
    it('should find and delete all caches for assignee in a single batch', async () => {
      mockRepoInterface.find.mockResolvedValue([mockEntity]);
      mockRepoInterface.deleteMany.mockResolvedValue([mockEntity]);

      await repo.removeAllByAssignee(ctx, 'test-assignee');

      expect(mockRepoInterface.find).toHaveBeenCalledWith({
        where: w.eq('assigneeId', 'test-assignee'),
        ctx,
      });
      const expectedPersistence = mapper.toPersistence(
        toCacheDomain(mockEntity),
      );
      expect(mockRepoInterface.deleteMany).toHaveBeenCalledWith(
        [expectedPersistence],
        { ctx },
      );
    });

    it('should call deleteMany with empty array when no caches found', async () => {
      mockRepoInterface.find.mockResolvedValue([]);
      mockRepoInterface.deleteMany.mockResolvedValue([]);

      await repo.removeAllByAssignee(ctx, 'none');

      expect(mockRepoInterface.deleteMany).toHaveBeenCalledWith([], { ctx });
    });
  });

  describe('softRemove', () => {
    it('should stamp deleted and soft delete the plain entity', async () => {
      mockRepoInterface.softDelete.mockResolvedValue(undefined as never);

      const cache = toCacheDomain(mockEntity);
      const stampSpy = vi.spyOn(cache, 'stampDeleted');

      await repo.softRemove(ctx, cache);

      expect(stampSpy).toHaveBeenCalledTimes(1);
      expect(mockRepoInterface.softDelete).toHaveBeenCalledWith(
        mapper.toPersistence(cache),
        { ctx },
      );
    });
  });
});

import { Where } from '@concepta/nestjs-repository';
import { createMockRepository } from '@concepta/nestjs-repository/testing';

import {
  createMockOtpEntity,
  toOtpDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { Otp } from '../../../domain/aggregates/otp.js';
import { type OtpEntityInterface } from '../interfaces/otp-entity.interface.js';
import { OtpMapper } from '../otp.mapper.js';
import { OtpRepository } from '../otp.repository.js';

const mapper = new OtpMapper();

describe(OtpRepository.name, () => {
  let repo: OtpRepository;
  let mockRepository: ReturnType<
    typeof createMockRepository<OtpEntityInterface>
  >;

  const w = Where.for<OtpEntityInterface>();
  const entity = createMockOtpEntity();
  const ctx = {};

  beforeEach(() => {
    mockRepository = createMockRepository<OtpEntityInterface>();
    repo = new OtpRepository(mockRepository, new OtpMapper());
  });

  describe('get', () => {
    it('should query by id and return an Otp', async () => {
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repo.get(ctx, 'test-id');

      expect(result).toBeInstanceOf(Otp);
      expect(result!.id).toBe('test-id');
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: w.eq('id', 'test-id'),
        ctx,
      });
    });

    it('should return null when entity is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repo.get(ctx, 'missing');

      expect(result).toBeNull();
    });

    it('should pass ctx to repository', async () => {
      mockRepository.findOne.mockResolvedValue(entity);
      const specificCtx = {};

      await repo.get(specificCtx, 'test-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: w.eq('id', 'test-id'),
        ctx: specificCtx,
      });
    });
  });

  describe('findActiveByPasscode', () => {
    it('should query by category, passcode, and active=true', async () => {
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repo.findActiveByPasscode(ctx, {
        category: 'auth',
        passcode: 'abc',
      });

      expect(result).toBeInstanceOf(Otp);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: w.and(
          w.eq('category', 'auth'),
          w.eq('passcode', 'abc'),
          w.eq('active', true),
        ),
        ctx,
      });
    });

    it('should return null when no match', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repo.findActiveByPasscode(ctx, {
        category: 'auth',
        passcode: 'missing',
      });

      expect(result).toBeNull();
    });
  });

  describe('findByPasscode', () => {
    it('should query by category and passcode', async () => {
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repo.findByPasscode(ctx, {
        category: 'auth',
        passcode: 'abc',
      });

      expect(result).toBeInstanceOf(Otp);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: w.and(w.eq('category', 'auth'), w.eq('passcode', 'abc')),
        ctx,
      });
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repo.findByPasscode(ctx, {
        category: 'auth',
        passcode: 'missing',
      });

      expect(result).toBeNull();
    });
  });

  describe('findActiveByAssignee', () => {
    it('should query by assigneeId, category, and active=true', async () => {
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repo.findActiveByAssignee(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
      });

      expect(result).toBeInstanceOf(Otp);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: w.and(
          w.eq('assigneeId', 'user-1'),
          w.eq('category', 'auth'),
          w.eq('active', true),
        ),
        ctx,
      });
    });

    it('should return null when no active OTP exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repo.findActiveByAssignee(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
      });

      expect(result).toBeNull();
    });
  });

  describe('findAllByAssigneeAndCategory', () => {
    it('should query by assigneeId and category', async () => {
      mockRepository.find.mockResolvedValue([entity, entity]);

      const result = await repo.findAllByAssigneeAndCategory(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Otp);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: w.and(w.eq('assigneeId', 'user-1'), w.eq('category', 'auth')),
        ctx,
      });
    });

    it('should return empty array when none found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await repo.findAllByAssigneeAndCategory(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('countCreatedSince', () => {
    it('should count by assigneeId, category, and dateCreated >= cutoff', async () => {
      mockRepository.count.mockResolvedValue(5);
      const cutoffDate = new Date('2026-01-01');

      const result = await repo.countCreatedSince(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
        cutoffDate,
      });

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: w.and(
          w.eq('assigneeId', 'user-1'),
          w.eq('category', 'auth'),
          w.gte('dateCreated', cutoffDate),
        ),
        ctx,
      });
    });

    it('should pass ctx to repository', async () => {
      mockRepository.count.mockResolvedValue(0);
      const specificCtx = {};

      await repo.countCreatedSince(specificCtx, {
        assigneeId: 'user-1',
        category: 'auth',
        cutoffDate: new Date(),
      });

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({ ctx: specificCtx }),
      );
    });
  });

  describe('findOlderThan', () => {
    it('should query by assigneeId, category, and dateCreated <= cutoff', async () => {
      mockRepository.find.mockResolvedValue([entity]);
      const cutoffDate = new Date('2026-01-01');

      const result = await repo.findOlderThan(ctx, {
        assigneeId: 'user-1',
        category: 'auth',
        cutoffDate,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Otp);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: w.and(
          w.eq('assigneeId', 'user-1'),
          w.eq('category', 'auth'),
          w.lte('dateCreated', cutoffDate),
        ),
        ctx,
      });
    });
  });

  describe('save', () => {
    it('should stamp and upsert the plain entity', async () => {
      mockRepository.upsert.mockResolvedValue(entity);

      const otp = toOtpDomain(entity);
      const stampSpy = vi.spyOn(otp, 'stampUpdated');

      await repo.save(ctx, otp);

      expect(stampSpy).toHaveBeenCalledTimes(1);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        mapper.toPersistence(otp),
        { ctx },
      );
    });
  });

  describe('remove', () => {
    it('should delete the plain entity', async () => {
      mockRepository.delete.mockResolvedValue(entity);

      const otp = toOtpDomain(entity);
      await repo.remove(ctx, otp);

      expect(mockRepository.delete).toHaveBeenCalledWith(
        mapper.toPersistence(otp),
        { ctx },
      );
    });
  });

  describe('removeAll', () => {
    it('should delete all OTPs in a single batch', async () => {
      mockRepository.deleteMany.mockResolvedValue([entity, entity]);

      const otp1 = toOtpDomain(entity);
      const otp2 = toOtpDomain({ ...entity, id: 'otp-2' });

      await repo.removeAll(ctx, [otp1, otp2]);

      expect(mockRepository.deleteMany).toHaveBeenCalledWith(
        [mapper.toPersistence(otp1), mapper.toPersistence(otp2)],
        { ctx },
      );
    });

    it('should handle empty array', async () => {
      mockRepository.deleteMany.mockResolvedValue([]);

      await repo.removeAll(ctx, []);

      expect(mockRepository.deleteMany).toHaveBeenCalledWith([], { ctx });
    });
  });
});

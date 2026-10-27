import { mock, type MockProxy } from 'vitest-mock-extended';

import { type RepositoryInterface } from '@concepta/nestjs-repository';

import { createMockUserEntity } from '../../../__tests__/helpers/mock.helpers.js';
import { User } from '../../../domain/aggregates/user.js';
import { type UserEntityInterface } from '../../../domain/interfaces/user-entity.interface.js';
import { UserMapper } from '../user.mapper.js';
import { UserRepository } from '../user.repository.js';

const userMapper = new UserMapper();

const mockEntity = createMockUserEntity();

describe(UserRepository.name, () => {
  const innerRepo: MockProxy<RepositoryInterface<UserEntityInterface>> =
    mock<RepositoryInterface<UserEntityInterface>>();
  let repository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserRepository(innerRepo, new UserMapper());
  });

  describe('get', () => {
    it('should return User when found', async () => {
      innerRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.get({}, 'user-1');

      expect(result).toBeInstanceOf(User);
      expect(result!.id).toBe('user-1');
      expect(result!.email).toBe('a@b.com');
    });

    it('should return null when not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);

      const result = await repository.get({}, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return User when found', async () => {
      innerRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findByEmail({}, 'a@b.com');

      expect(result).toBeInstanceOf(User);
      expect(result!.email).toBe('a@b.com');
    });

    it('should return null when not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail({}, 'missing@b.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return User when found', async () => {
      innerRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findByUsername({}, 'john');

      expect(result).toBeInstanceOf(User);
      expect(result!.username).toBe('john');
    });

    it('should return null when not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByUsername({}, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should stamp and upsert the plain entity', async () => {
      innerRepo.upsert.mockResolvedValue(mockEntity);

      const user = userMapper.toDomain(mockEntity);
      const stampSpy = vi.spyOn(user, 'stampUpdated');

      await repository.save({}, user);

      expect(stampSpy).toHaveBeenCalledTimes(1);
      expect(innerRepo.upsert).toHaveBeenCalledWith(
        userMapper.toPersistence(user),
        { ctx: {} },
      );
    });
  });

  describe('remove', () => {
    it('should delete the user', async () => {
      innerRepo.delete.mockResolvedValue(mockEntity);

      const user = userMapper.toDomain(mockEntity);
      await repository.remove({}, user);

      expect(innerRepo.delete).toHaveBeenCalledTimes(1);
    });
  });
});

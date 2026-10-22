import { mock, type MockProxy } from 'vitest-mock-extended';

import { type RepositoryInterface } from '@concepta/nestjs-repository';

import { UserCredentials } from '../../../domain/aggregates/user-credentials.js';
import { type UserCredentialEntityInterface } from '../../../domain/interfaces/user-credential-entity.interface.js';
import { UserCredentialsMapper } from '../user-credentials.mapper.js';
import { UserCredentialsRepository } from '../user-credentials.repository.js';

const credentialsMapper = new UserCredentialsMapper();

const mockEntity: UserCredentialEntityInterface = {
  id: 'cred-1',
  userId: 'user-1',
  passwordHash: 'hash',
  active: true,
  validFrom: new Date('2024-01-01'),
  validTo: null,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-01'),
  dateDeleted: null,
  version: 1,
};

describe(UserCredentialsRepository.name, () => {
  const innerRepo: MockProxy<
    RepositoryInterface<UserCredentialEntityInterface>
  > = mock<RepositoryInterface<UserCredentialEntityInterface>>();
  let repository: UserCredentialsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserCredentialsRepository(
      innerRepo,
      new UserCredentialsMapper(),
    );
  });

  describe('findActiveByUserId', () => {
    it('should return UserCredentials when found', async () => {
      innerRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findActiveByUserId({}, 'user-1');

      expect(result).toBeInstanceOf(UserCredentials);
      expect(result!.userId).toBe('user-1');
      expect(result!.active).toBe(true);
    });

    it('should return null when not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);

      const result = await repository.findActiveByUserId({}, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return array of UserCredentials', async () => {
      innerRepo.find.mockResolvedValue([mockEntity]);

      const result = await repository.findByUserId({}, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(UserCredentials);
    });

    it('should return empty array when none found', async () => {
      innerRepo.find.mockResolvedValue([]);

      const result = await repository.findByUserId({}, 'user-1');

      expect(result).toHaveLength(0);
    });

    it('should pass limitDate filter when provided', async () => {
      innerRepo.find.mockResolvedValue([]);
      const limitDate = new Date('2024-06-01');

      await repository.findByUserId({}, 'user-1', limitDate);

      expect(innerRepo.find).toHaveBeenCalledTimes(1);
      const options = innerRepo.find.mock.calls[0][0];
      expect(options).toBeDefined();
    });

    it('should work without limitDate', async () => {
      innerRepo.find.mockResolvedValue([]);

      await repository.findByUserId({}, 'user-1');

      expect(innerRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('should stamp and upsert the plain entity', async () => {
      innerRepo.upsert.mockResolvedValue(mockEntity);

      const entry = credentialsMapper.toDomain(mockEntity);
      const stampSpy = vi.spyOn(entry, 'stampUpdated');

      await repository.save({}, entry);

      expect(stampSpy).toHaveBeenCalledTimes(1);
      expect(innerRepo.upsert).toHaveBeenCalledWith(
        credentialsMapper.toPersistence(entry),
        { ctx: {} },
      );
    });
  });
});

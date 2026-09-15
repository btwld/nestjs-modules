import { randomUUID } from 'crypto';

import { Test, type TestingModule } from '@nestjs/testing';

import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { AppRepoModuleFixture } from '../../../__tests__/fixtures/app-repo.module.fixture.js';
import { UserCredentials } from '../../../domain/aggregates/user-credentials.js';
import { User } from '../../../domain/aggregates/user.js';
import { type UserCredentialEntityInterface } from '../../../domain/interfaces/user-credential-entity.interface.js';
import { type UserCredentialsRepositoryInterface } from '../../../domain/repositories/user-credentials-repository.interface.js';
import { type UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import {
  USER_CREDENTIALS_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../user.constants.js';
import { UserCredentialsMapper } from '../user-credentials.mapper.js';
import { UserCredentialsRepository } from '../user-credentials.repository.js';

describe(UserCredentialsRepository.name + ' (e2e)', () => {
  let moduleFixture: TestingModule;
  let credentialsRepository: UserCredentialsRepositoryInterface;
  let userRepository: UserRepositoryInterface;
  const eventContext = createTestEventContext({}, {});
  const credentialsMapper = new UserCredentialsMapper();

  let testUser: User;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppRepoModuleFixture],
    }).compile();

    credentialsRepository =
      moduleFixture.get<UserCredentialsRepositoryInterface>(
        USER_CREDENTIALS_REPOSITORY_TOKEN,
      );

    userRepository = moduleFixture.get<UserRepositoryInterface>(
      USER_REPOSITORY_TOKEN,
    );

    testUser = User.create(eventContext, {
      email: 'cred-test@example.com',
      username: 'credtestuser',
    });
    await userRepository.save({}, testUser);
  });

  afterEach(async () => {
    await moduleFixture?.close();
  });

  describe('findActiveByUserId', () => {
    it('should return active credentials for user', async () => {
      const creds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash1',
      });
      await credentialsRepository.save({}, creds);

      const found = await credentialsRepository.findActiveByUserId(
        {},
        testUser.id,
      );

      expect(found).toBeInstanceOf(UserCredentials);
      expect(found!.userId).toBe(testUser.id);
      expect(found!.active).toBe(true);
    });

    it('should return null when no credentials exist', async () => {
      const found = await credentialsRepository.findActiveByUserId(
        {},
        testUser.id,
      );

      expect(found).toBeNull();
    });

    it('should not return inactive credentials', async () => {
      const creds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash1',
      });
      creds.deactivate(eventContext);
      await credentialsRepository.save({}, creds);

      const found = await credentialsRepository.findActiveByUserId(
        {},
        testUser.id,
      );

      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all credentials (active and inactive)', async () => {
      const creds1 = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash1',
      });
      await credentialsRepository.save({}, creds1);

      creds1.deactivate(eventContext);
      await credentialsRepository.save({}, creds1);

      const creds2 = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash2',
      });
      await credentialsRepository.save({}, creds2);

      const found = await credentialsRepository.findByUserId({}, testUser.id);

      expect(found).toHaveLength(2);
    });

    it('should return empty array when none exist', async () => {
      const found = await credentialsRepository.findByUserId({}, testUser.id);

      expect(found).toHaveLength(0);
    });

    it('should filter by limitDate', async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const oldEntity: UserCredentialEntityInterface = {
        id: randomUUID(),
        userId: testUser.id,
        passwordHash: 'old-hash',
        active: false,
        validFrom: sixtyDaysAgo,
        validTo: new Date(sixtyDaysAgo.getTime() + 86400000),
        dateCreated: sixtyDaysAgo,
        dateUpdated: sixtyDaysAgo,
        dateDeleted: null,
        version: 1,
      };
      const oldCreds = credentialsMapper.toDomain(oldEntity);
      await credentialsRepository.save({}, oldCreds);

      const recentCreds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'recent-hash',
      });
      await credentialsRepository.save({}, recentCreds);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const found = await credentialsRepository.findByUserId(
        {},
        testUser.id,
        thirtyDaysAgo,
      );

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(recentCreds.id);
    });

    it('should order by validFrom descending', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const olderEntity: UserCredentialEntityInterface = {
        id: randomUUID(),
        userId: testUser.id,
        passwordHash: 'older-hash',
        active: false,
        validFrom: thirtyDaysAgo,
        validTo: null,
        dateCreated: thirtyDaysAgo,
        dateUpdated: thirtyDaysAgo,
        dateDeleted: null,
        version: 1,
      };
      const olderCreds = credentialsMapper.toDomain(olderEntity);
      await credentialsRepository.save({}, olderCreds);

      const newerCreds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'newer-hash',
      });
      await credentialsRepository.save({}, newerCreds);

      const found = await credentialsRepository.findByUserId({}, testUser.id);

      expect(found).toHaveLength(2);
      expect(found[0].id).toBe(newerCreds.id);
      expect(found[1].id).toBe(olderCreds.id);
    });
  });

  describe('save', () => {
    it('should persist new credentials', async () => {
      const creds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash1',
      });

      await credentialsRepository.save({}, creds);

      const found = await credentialsRepository.findActiveByUserId(
        {},
        testUser.id,
      );
      expect(found).not.toBeNull();
      expect(found!.id).toBe(creds.id);
    });

    it('should update existing credentials', async () => {
      const creds = UserCredentials.create(eventContext, {
        userId: testUser.id,
        passwordHash: 'hash1',
      });
      await credentialsRepository.save({}, creds);

      creds.deactivate(eventContext);
      await credentialsRepository.save({}, creds);

      const found = await credentialsRepository.findActiveByUserId(
        {},
        testUser.id,
      );
      expect(found).toBeNull();
    });
  });
});

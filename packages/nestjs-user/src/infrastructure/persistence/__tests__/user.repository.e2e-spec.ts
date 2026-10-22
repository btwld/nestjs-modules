import { Test, type TestingModule } from '@nestjs/testing';

import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { AppRepoModuleFixture } from '../../../__tests__/fixtures/app-repo.module.fixture.js';
import { User } from '../../../domain/aggregates/user.js';
import { type UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { UserRepository } from '../user.repository.js';

describe(UserRepository.name + ' (e2e)', () => {
  let moduleFixture: TestingModule;
  let userRepository: UserRepositoryInterface;
  const eventContext = createTestEventContext({}, {});

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppRepoModuleFixture],
    }).compile();

    userRepository = moduleFixture.get<UserRepositoryInterface>(
      USER_REPOSITORY_TOKEN,
    );
  });

  afterEach(async () => {
    await moduleFixture?.close();
  });

  describe('get', () => {
    it('should return User when found', async () => {
      const user = User.create(eventContext, {
        email: 'a@b.com',
        username: 'john',
      });
      await userRepository.save({}, user);

      const found = await userRepository.get({}, user.id);

      expect(found).toBeInstanceOf(User);
      expect(found!.id).toBe(user.id);
      expect(found!.email).toBe('a@b.com');
      expect(found!.username).toBe('john');
      expect(found!.active).toBe(true);
    });

    it('should return null when not found', async () => {
      const found = await userRepository.get({}, 'nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return User when found', async () => {
      const user = User.create(eventContext, {
        email: 'find-by-email@test.com',
        username: 'emailuser',
      });
      await userRepository.save({}, user);

      const found = await userRepository.findByEmail(
        {},
        'find-by-email@test.com',
      );

      expect(found).toBeInstanceOf(User);
      expect(found!.email).toBe('find-by-email@test.com');
    });

    it('should return null when not found', async () => {
      const found = await userRepository.findByEmail({}, 'nobody@example.com');

      expect(found).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return User when found', async () => {
      const user = User.create(eventContext, {
        email: 'u@b.com',
        username: 'uniqueuser',
      });
      await userRepository.save({}, user);

      const found = await userRepository.findByUsername({}, 'uniqueuser');

      expect(found).toBeInstanceOf(User);
      expect(found!.username).toBe('uniqueuser');
    });

    it('should return null when not found', async () => {
      const found = await userRepository.findByUsername({}, 'ghost');

      expect(found).toBeNull();
    });
  });

  describe('save', () => {
    it('should persist a new user', async () => {
      const user = User.create(eventContext, {
        email: 'new@b.com',
        username: 'newuser',
      });

      await userRepository.save({}, user);

      const found = await userRepository.get({}, user.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
    });

    it('should update an existing user', async () => {
      const user = User.create(eventContext, {
        email: 'update@b.com',
        username: 'updateuser',
      });
      await userRepository.save({}, user);

      user.update(eventContext, { email: 'updated@b.com' });
      await userRepository.save({}, user);

      const found = await userRepository.get({}, user.id);
      expect(found!.email).toBe('updated@b.com');
      expect(found!.version).toBe(2);
    });
  });

  describe('remove', () => {
    it('should delete the user', async () => {
      const user = User.create(eventContext, {
        email: 'delete@b.com',
        username: 'deleteuser',
      });
      await userRepository.save({}, user);

      await userRepository.remove({}, user);

      const found = await userRepository.get({}, user.id);
      expect(found).toBeNull();
    });
  });
});

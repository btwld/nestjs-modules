import { type Mocked } from 'vitest';

import {
  createMockUserEntity,
  createMockUserRepository,
  toUserDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type UserRepositoryInterface } from '../../../../domain/repositories/user-repository.interface.js';
import { GetUserByEmailQuery } from '../../impl/get-user-by-email.query.js';
import { GetUserBySubjectQuery } from '../../impl/get-user-by-subject.query.js';
import { GetUserByUsernameQuery } from '../../impl/get-user-by-username.query.js';
import { GetUserQuery } from '../../impl/get-user.query.js';
import { GetUserByEmailHandler } from '../get-user-by-email.handler.js';
import { GetUserBySubjectHandler } from '../get-user-by-subject.handler.js';
import { GetUserByUsernameHandler } from '../get-user-by-username.handler.js';
import { GetUserHandler } from '../get-user.handler.js';

const mockUser = toUserDomain(createMockUserEntity());

describe(GetUserHandler.name, () => {
  let handler: GetUserHandler;
  let repo: Mocked<UserRepositoryInterface>;

  beforeEach(() => {
    repo = createMockUserRepository();
    handler = new GetUserHandler(repo);
  });

  it('should return user when found', async () => {
    repo.get.mockResolvedValue(mockUser);
    const result = await handler.execute(new GetUserQuery({}, 'user-1'));
    expect(result).toBe(mockUser);
    expect(repo.get).toHaveBeenCalledWith(expect.any(Object), 'user-1');
  });

  it('should return null when not found', async () => {
    repo.get.mockResolvedValue(null);
    const result = await handler.execute(new GetUserQuery({}, 'missing'));
    expect(result).toBeNull();
  });
});

describe(GetUserByEmailHandler.name, () => {
  let handler: GetUserByEmailHandler;
  let repo: Mocked<UserRepositoryInterface>;

  beforeEach(() => {
    repo = createMockUserRepository();
    handler = new GetUserByEmailHandler(repo);
  });

  it('should return user when found', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);
    const result = await handler.execute(
      new GetUserByEmailQuery({}, 'a@b.com'),
    );
    expect(result).toBe(mockUser);
    expect(repo.findByEmail).toHaveBeenCalledWith(
      expect.any(Object),
      'a@b.com',
    );
  });

  it('should return null when not found', async () => {
    repo.findByEmail.mockResolvedValue(null);
    const result = await handler.execute(
      new GetUserByEmailQuery({}, 'missing@b.com'),
    );
    expect(result).toBeNull();
  });
});

describe(GetUserByUsernameHandler.name, () => {
  let handler: GetUserByUsernameHandler;
  let repo: Mocked<UserRepositoryInterface>;

  beforeEach(() => {
    repo = createMockUserRepository();
    handler = new GetUserByUsernameHandler(repo);
  });

  it('should return user when found', async () => {
    repo.findByUsername.mockResolvedValue(mockUser);
    const result = await handler.execute(
      new GetUserByUsernameQuery({}, 'john'),
    );
    expect(result).toBe(mockUser);
    expect(repo.findByUsername).toHaveBeenCalledWith(
      expect.any(Object),
      'john',
    );
  });

  it('should return null when not found', async () => {
    repo.findByUsername.mockResolvedValue(null);
    const result = await handler.execute(
      new GetUserByUsernameQuery({}, 'missing'),
    );
    expect(result).toBeNull();
  });
});

describe(GetUserBySubjectHandler.name, () => {
  let handler: GetUserBySubjectHandler;
  let repo: Mocked<UserRepositoryInterface>;

  beforeEach(() => {
    repo = createMockUserRepository();
    handler = new GetUserBySubjectHandler(repo);
  });

  it('should return user when found', async () => {
    repo.get.mockResolvedValue(mockUser);
    const result = await handler.execute(
      new GetUserBySubjectQuery({}, 'sub-1'),
    );
    expect(result).toBe(mockUser);
    expect(repo.get).toHaveBeenCalledWith(expect.any(Object), 'sub-1');
  });

  it('should return null when not found', async () => {
    repo.get.mockResolvedValue(null);
    const result = await handler.execute(
      new GetUserBySubjectQuery({}, 'missing'),
    );
    expect(result).toBeNull();
  });
});

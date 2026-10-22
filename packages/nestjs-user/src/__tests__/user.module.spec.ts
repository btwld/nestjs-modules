import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { type User } from '../domain/aggregates/user.js';
import { type UserRepositoryInterface } from '../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../user.constants.js';
import { UserModule } from '../user.module.js';

@Injectable()
class OwnUserRepository implements UserRepositoryInterface {
  async get(): Promise<User | null> {
    return null;
  }

  async findByEmail(): Promise<User | null> {
    return null;
  }

  async findByUsername(): Promise<User | null> {
    return null;
  }

  async save(): Promise<void> {}

  async remove(): Promise<void> {}
}

describe('UserModule repositories', () => {
  it('starts on its own repository without registering the user entity', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RepositoryModule.forRoot({}),
        UserModule.forRoot({
          entities: { user: 'user' },
          repositories: { user: OwnUserRepository },
        }),
      ],
    }).compile();

    expect(moduleRef.get(USER_REPOSITORY_TOKEN)).toBeInstanceOf(
      OwnUserRepository,
    );

    await moduleRef.close();
  });

  it('refuses to start when the user entity is neither registered nor replaced', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({}),
          UserModule.forRoot({ entities: { user: 'user' } }),
        ],
      }).compile(),
    ).rejects.toThrow('asks for "user", which is not registered');
  });
});

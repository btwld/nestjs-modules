import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CreatePasswordCommand,
  ValidateCurrentPasswordCommand,
  ValidatePasswordHistoryCommand,
} from '@concepta/nestjs-password';
import {
  getDynamicRepositoryToken,
  RepositoryModule,
} from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { UserCredentialsMapper } from '../infrastructure/persistence/user-credentials.mapper.js';
import { UserCredentialsRepository } from '../infrastructure/persistence/user-credentials.repository.js';
import { UserMapper } from '../infrastructure/persistence/user.mapper.js';
import { UserRepository } from '../infrastructure/persistence/user.repository.js';
import {
  USER_CREDENTIALS_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../user.constants.js';
import { UserModule } from '../user.module.js';

import { UserCredentialEntityFixture } from './fixtures/entities/user-credential.entity.fixture.js';
import { UserEntityFixture } from './fixtures/entities/user.entity.fixture.js';
import { ormConfig } from './fixtures/ormconfig.fixture.js';

class OwnUserRepository extends UserRepository {
  get repositoryUsed() {
    return this.repository;
  }

  get mapperUsed() {
    return this.mapper;
  }
}

class OwnUserCredentialsRepository extends UserCredentialsRepository {
  get repositoryUsed() {
    return this.repository;
  }

  get mapperUsed() {
    return this.mapper;
  }
}

describe('UserModule repositories', () => {
  it('builds repository subclasses around the registered repositories and the mappers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(ormConfig),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                { key: 'user', entity: UserEntityFixture },
                {
                  key: 'user-credentials',
                  entity: UserCredentialEntityFixture,
                },
              ],
            },
          ],
        }),
        UserModule.forRoot({
          entities: { user: 'user', credentials: 'user-credentials' },
          repositories: {
            user: OwnUserRepository,
            userCredentials: OwnUserCredentialsRepository,
          },
          ports: {
            password: {
              createCommand: CreatePasswordCommand,
              validateCurrentCommand: ValidateCurrentPasswordCommand,
              validateHistoryCommand: ValidatePasswordHistoryCommand,
            },
          },
        }),
      ],
    }).compile();

    const users = moduleRef.get(USER_REPOSITORY_TOKEN);
    expect(users).toBeInstanceOf(OwnUserRepository);
    expect(users.repositoryUsed).toBe(
      moduleRef.get(getDynamicRepositoryToken('user')),
    );
    expect(users.mapperUsed).toBe(moduleRef.get(UserMapper));

    const credentials = moduleRef.get(USER_CREDENTIALS_REPOSITORY_TOKEN);
    expect(credentials).toBeInstanceOf(OwnUserCredentialsRepository);
    expect(credentials.repositoryUsed).toBe(
      moduleRef.get(getDynamicRepositoryToken('user-credentials')),
    );
    expect(credentials.mapperUsed).toBe(moduleRef.get(UserCredentialsMapper));

    await moduleRef.close();
  });

  it('refuses to start when the user entity is not registered', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({}),
          UserModule.forRoot({
            entities: { user: 'user' },
            repositories: { user: OwnUserRepository },
          }),
        ],
      }).compile(),
    ).rejects.toThrow('asks for "user", which is not registered');
  });
});

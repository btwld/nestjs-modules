import { type INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppRepoStrictPasswordModuleFixture } from '../../../../__tests__/fixtures/app-repo-strict-password.module.fixture.js';
import { type UserRepositoryInterface } from '../../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../../user.constants.js';
import { CreateUserCommand } from '../../impl/create-user.command.js';

/**
 * Regression coverage for #469 through the real production code path — a
 * weak password must be rejected before the user row is written, on any
 * transaction-factory configuration, not merely rolled back afterward.
 */
describe(CreateUserCommand.name + ' (e2e)', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let userRepository: UserRepositoryInterface;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppRepoStrictPasswordModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    commandBus = app.get(CommandBus);
    userRepository = app.get<UserRepositoryInterface>(USER_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should reject a weak password without persisting the user', async () => {
    await expect(
      commandBus.execute(
        new CreateUserCommand(
          {},
          {
            email: 'weak-password@example.com',
            username: 'weakpassworduser',
            password: 'password123',
          },
        ),
      ),
    ).rejects.toThrow();

    const found = await userRepository.findByEmail(
      {},
      'weak-password@example.com',
    );
    expect(found).toBeNull();
  });
});

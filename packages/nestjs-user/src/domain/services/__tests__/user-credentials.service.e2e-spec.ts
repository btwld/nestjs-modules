import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppContextHost } from '@concepta/nestjs-core';
import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { AppRepoModuleFixture } from '../../../__tests__/fixtures/app-repo.module.fixture.js';
import {
  USER_CREDENTIALS_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../user.constants.js';
import { User } from '../../aggregates/user.js';
import { type UserCredentialsRepositoryInterface } from '../../repositories/user-credentials-repository.interface.js';
import { type UserRepositoryInterface } from '../../repositories/user-repository.interface.js';
import { UserCredentialsService } from '../user-credentials.service.js';

/**
 * Regression coverage for #468 through a real production code path —
 * `setPassword` and `updatePassword` each open their own `TransactionScope.run()`.
 * Calling both against the same request-lived `AppContextHost`, then doing a
 * plain repository read on that same context, is exactly the shape of the
 * reported bug (`RecoveryService.updatePassword` in nestjs-authentication
 * follows this same pattern).
 */
describe(UserCredentialsService.name + ' (e2e)', () => {
  let app: INestApplication;
  let service: UserCredentialsService;
  let userRepository: UserRepositoryInterface;
  let credentialsRepository: UserCredentialsRepositoryInterface;
  const eventContext = createTestEventContext({}, {});

  let testUser: User;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppRepoModuleFixture],
    }).compile();

    // CommandBus handler registration (e.g. CreatePasswordCommand) only
    // happens on application bootstrap, not on compile().
    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get(UserCredentialsService);
    userRepository = app.get<UserRepositoryInterface>(USER_REPOSITORY_TOKEN);
    credentialsRepository = app.get<UserCredentialsRepositoryInterface>(
      USER_CREDENTIALS_REPOSITORY_TOKEN,
    );

    testUser = User.create(eventContext, {
      email: 'trx-scope-test@example.com',
      username: 'trxscopetestuser',
    });
    await userRepository.save({}, testUser);
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should run setPassword then updatePassword on one context, and serve a plain read after', async () => {
    const ctx = new AppContextHost();

    await service.setPassword(ctx, eventContext, testUser.id, 'first-password');
    await service.updatePassword(
      ctx,
      eventContext,
      testUser.id,
      'second-password',
    );

    // Plain, non-transactional read on the same ctx both runs used.
    const active = await credentialsRepository.findActiveByUserId(
      ctx,
      testUser.id,
    );

    expect(active).not.toBeNull();
    expect(active!.userId).toBe(testUser.id);

    const history = await credentialsRepository.findByUserId(ctx, testUser.id);
    expect(history).toHaveLength(2);
  });
});

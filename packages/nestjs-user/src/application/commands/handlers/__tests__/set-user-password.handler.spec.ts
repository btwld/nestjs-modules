import { createMockCommandBus } from '@concepta/nestjs-core/testing';

import {
  createMockTxScope,
  createMockUserEntity,
  createMockUserRepository,
  toUserDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type UserCredentials } from '../../../../domain/aggregates/user-credentials.js';
import { UserNotFoundException } from '../../../exceptions/user-not-found.exception.js';
import { type CreateUserCredentialCommand } from '../../impl/create-user-credential.command.js';
import { SetUserPasswordCommand } from '../../impl/set-user-password.command.js';
import { SetUserPasswordHandler } from '../set-user-password.handler.js';

describe(SetUserPasswordHandler.name, () => {
  const userRepository = createMockUserRepository();
  const commandBus = createMockCommandBus();
  const txScope = createMockTxScope();
  const mockCredentials = {} as UserCredentials;

  let handler: SetUserPasswordHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    commandBus.execute.mockResolvedValue(mockCredentials);
    handler = new SetUserPasswordHandler(userRepository, commandBus, txScope);
  });

  it('should dispatch CreateUserCredentialCommand when user found', async () => {
    userRepository.get.mockResolvedValue(toUserDomain(createMockUserEntity()));

    const result = await handler.execute(
      new SetUserPasswordCommand({}, 'user-1', 'secret'),
    );

    expect(result).toBe(mockCredentials);
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const dispatched = commandBus.execute.mock
      .calls[0][0] as CreateUserCredentialCommand;
    expect(dispatched.userId).toBe('user-1');
    expect(dispatched.password).toBe('secret');
  });

  it('should throw UserNotFoundException when not found', async () => {
    userRepository.get.mockResolvedValue(null);

    await expect(
      handler.execute(new SetUserPasswordCommand({}, 'missing', 'secret')),
    ).rejects.toThrow(UserNotFoundException);
  });
});

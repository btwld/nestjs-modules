import { createMockCommandBus } from '@concepta/nestjs-core/testing';

import {
  createMockTxScope,
  createMockUserEntity,
  createMockUserRepository,
  toUserDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { UserNotFoundException } from '../../../exceptions/user-not-found.exception.js';
import { type UpdateUserCredentialCommand } from '../../impl/update-user-credential.command.js';
import { UpdateUserPasswordCommand } from '../../impl/update-user-password.command.js';
import { UpdateUserPasswordHandler } from '../update-user-password.handler.js';

describe(UpdateUserPasswordHandler.name, () => {
  const userRepository = createMockUserRepository();
  const commandBus = createMockCommandBus();
  const txScope = createMockTxScope();

  let handler: UpdateUserPasswordHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateUserPasswordHandler(
      userRepository,
      commandBus,
      txScope,
    );
  });

  it('should dispatch UpdateUserCredentialCommand when user found', async () => {
    userRepository.get.mockResolvedValue(toUserDomain(createMockUserEntity()));

    const passwordDto = { password: 'new-pass', passwordCurrent: 'old-pass' };

    await handler.execute(
      new UpdateUserPasswordCommand({}, 'user-1', passwordDto),
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const dispatched = commandBus.execute.mock
      .calls[0][0] as UpdateUserCredentialCommand;
    expect(dispatched.userId).toBe('user-1');
    expect(dispatched.passwordDto).toBe(passwordDto);
  });

  it('should throw UserNotFoundException when not found', async () => {
    userRepository.get.mockResolvedValue(null);

    await expect(
      handler.execute(
        new UpdateUserPasswordCommand({}, 'missing', {
          password: 'new',
        }),
      ),
    ).rejects.toThrow(UserNotFoundException);
  });
});

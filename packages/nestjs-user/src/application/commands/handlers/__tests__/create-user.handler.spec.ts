import { createMockCommandBus } from '@concepta/nestjs-core/testing';

import {
  createMockEventPublisher,
  createMockPasswordPort,
  createMockTxScope,
  createMockUserRepository,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { User } from '../../../../domain/aggregates/user.js';
import { type UserCreatableInterface } from '../../../../domain/interfaces/user-creatable.interface.js';
import { type CreateUserCredentialCommand } from '../../impl/create-user-credential.command.js';
import { CreateUserCommand } from '../../impl/create-user.command.js';
import { CreateUserHandler } from '../create-user.handler.js';

describe(CreateUserHandler.name, () => {
  const userRepository = createMockUserRepository();
  const commandBus = createMockCommandBus();
  const eventPublisher = createMockEventPublisher();
  const txScope = createMockTxScope();
  const passwordPort = createMockPasswordPort();

  let handler: CreateUserHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordPort.create.mockResolvedValue({ passwordHash: 'hashed' });
    handler = new CreateUserHandler(
      userRepository,
      commandBus,
      eventPublisher,
      txScope,
      passwordPort,
    );
  });

  it('should create and save a user', async () => {
    const dto: UserCreatableInterface = {
      email: 'a@b.com',
      username: 'john',
    };

    const result = await handler.execute(new CreateUserCommand({}, dto));

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe('a@b.com');
    expect(result.username).toBe('john');
    expect(userRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should hash the password before saving and dispatch it as storage', async () => {
    const dto: UserCreatableInterface = {
      email: 'a@b.com',
      username: 'john',
      password: 'secret',
    };

    const result = await handler.execute(new CreateUserCommand({}, dto));

    expect(passwordPort.create).toHaveBeenCalledWith('secret');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const dispatched = commandBus.execute.mock
      .calls[0][0] as CreateUserCredentialCommand;
    expect(dispatched.userId).toBe(result.id);
    expect(dispatched.password).toEqual({ passwordHash: 'hashed' });
  });

  it('should not dispatch credential command when no password', async () => {
    const dto: UserCreatableInterface = {
      email: 'a@b.com',
      username: 'john',
    };

    await handler.execute(new CreateUserCommand({}, dto));

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('should reject a weak password before saving the user', async () => {
    const dto: UserCreatableInterface = {
      email: 'a@b.com',
      username: 'john',
      password: 'weak',
    };
    passwordPort.create.mockRejectedValue(new Error('password not strong'));

    await expect(
      handler.execute(new CreateUserCommand({}, dto)),
    ).rejects.toThrow('password not strong');

    expect(userRepository.save).not.toHaveBeenCalled();
    expect(txScope.run).not.toHaveBeenCalled();
  });
});

import {
  createMockEventPublisher,
  createMockTxScope,
  createMockUserEntity,
  createMockUserRepository,
  toUserDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { User } from '../../../../domain/aggregates/user.js';
import { UserNotFoundException } from '../../../exceptions/user-not-found.exception.js';
import { RemoveUserCommand } from '../../impl/remove-user.command.js';
import { RemoveUserHandler } from '../remove-user.handler.js';

describe(RemoveUserHandler.name, () => {
  const userRepository = createMockUserRepository();
  const eventPublisher = createMockEventPublisher();
  const txScope = createMockTxScope();

  let handler: RemoveUserHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RemoveUserHandler(userRepository, txScope, eventPublisher);
  });

  it('should remove and return user when found', async () => {
    userRepository.get.mockResolvedValue(toUserDomain(createMockUserEntity()));

    const result = await handler.execute(new RemoveUserCommand({}, 'user-1'));

    expect(result).toBeInstanceOf(User);
    expect(result.id).toBe('user-1');
    expect(userRepository.remove).toHaveBeenCalledTimes(1);
  });

  it('should throw UserNotFoundException when not found', async () => {
    userRepository.get.mockResolvedValue(null);

    await expect(
      handler.execute(new RemoveUserCommand({}, 'missing')),
    ).rejects.toThrow(UserNotFoundException);
  });
});

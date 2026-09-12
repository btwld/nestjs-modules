import {
  createMockEventPublisher,
  createMockTxScope,
  createMockUserEntity,
  createMockUserRepository,
  toUserDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { User } from '../../../../domain/aggregates/user.js';
import { UserNotFoundException } from '../../../exceptions/user-not-found.exception.js';
import { UpdateUserCommand } from '../../impl/update-user.command.js';
import { UpdateUserHandler } from '../update-user.handler.js';

describe(UpdateUserHandler.name, () => {
  const userRepository = createMockUserRepository();
  const eventPublisher = createMockEventPublisher();
  const txScope = createMockTxScope();

  let handler: UpdateUserHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateUserHandler(userRepository, eventPublisher, txScope);
  });

  it('should update and return user when found', async () => {
    userRepository.get.mockResolvedValue(toUserDomain(createMockUserEntity()));

    const result = await handler.execute(
      new UpdateUserCommand({}, 'user-1', { active: false }),
    );

    expect(result).toBeInstanceOf(User);
    expect(result.active).toBe(false);
    expect(result.version).toBe(2);
    expect(userRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw UserNotFoundException when not found', async () => {
    userRepository.get.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateUserCommand({}, 'missing', { active: false })),
    ).rejects.toThrow(UserNotFoundException);
  });
});

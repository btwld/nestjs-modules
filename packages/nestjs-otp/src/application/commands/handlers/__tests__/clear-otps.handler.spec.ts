import {
  createMockOtpEntity,
  createMockOtpRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { ClearOtpsCommand } from '../../impl/clear-otps.command.js';
import { ClearOtpsHandler } from '../clear-otps.handler.js';

describe(ClearOtpsHandler.name, () => {
  let handler: ClearOtpsHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    const mockTx = createMockTransaction();

    handler = new ClearOtpsHandler(mockResolver, mockTx.transaction);
  });

  it('should find and remove all OTPs for assignee and category', async () => {
    const otps = [
      toOtpDomain(createMockOtpEntity({ id: '1' })),
      toOtpDomain(createMockOtpEntity({ id: '2' })),
    ];
    mockRepo.findAllByAssigneeAndCategory.mockResolvedValue(otps);

    const command = new ClearOtpsCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(mockRepo.findAllByAssigneeAndCategory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assigneeId: 'test-assignee',
        category: 'test-category',
      }),
    );
    expect(mockRepo.removeAll).toHaveBeenCalledWith(expect.anything(), otps);
  });

  it('should not call removeAll when no OTPs found', async () => {
    mockRepo.findAllByAssigneeAndCategory.mockResolvedValue([]);

    const command = new ClearOtpsCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(mockRepo.removeAll).not.toHaveBeenCalled();
  });
});

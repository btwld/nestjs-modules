import {
  createMockOtpEntity,
  createMockOtpRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { RemoveOtpCommand } from '../../impl/remove-otp.command.js';
import { RemoveOtpHandler } from '../remove-otp.handler.js';

describe(RemoveOtpHandler.name, () => {
  let handler: RemoveOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;
  let mockTx: ReturnType<typeof createMockTransaction>;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    mockTx = createMockTransaction();

    handler = new RemoveOtpHandler(mockResolver, mockTx.transaction);
  });

  it('should find and remove an OTP by passcode', async () => {
    const found = toOtpDomain(createMockOtpEntity());
    mockRepo.findByPasscode.mockResolvedValue(found);

    const command = new RemoveOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
      passcode: 'test-passcode',
    });

    await handler.execute(command);

    expect(mockRepo.findByPasscode).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        category: 'test-category',
        passcode: 'test-passcode',
      }),
    );
    expect(mockRepo.remove).toHaveBeenCalledWith(expect.anything(), found);
  });

  it('should not call remove when OTP is not found', async () => {
    mockRepo.findByPasscode.mockResolvedValue(null);

    const command = new RemoveOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
      passcode: 'missing',
    });

    await handler.execute(command);

    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('should run within a transaction', async () => {
    mockRepo.findByPasscode.mockResolvedValue(null);

    const command = new RemoveOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'a',
      category: 'c',
      passcode: 'p',
    });

    await handler.execute(command);

    expect(mockTx.transaction.run).toHaveBeenCalled();
  });
});

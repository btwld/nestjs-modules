import {
  createMockOtpEntity,
  createMockEventPublisher,
  createMockOtpRepository,
  createMockRepositoryResolver,
  createMockTransaction,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { DeactivateOtpCommand } from '../../impl/deactivate-otp.command.js';
import { DeactivateOtpHandler } from '../deactivate-otp.handler.js';

describe(DeactivateOtpHandler.name, () => {
  let handler: DeactivateOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;
  let mockTx: ReturnType<typeof createMockTransaction>;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    mockTx = createMockTransaction();
    const mockPublisher = createMockEventPublisher();

    handler = new DeactivateOtpHandler(
      mockResolver,
      mockTx.transaction,
      mockPublisher,
    );
  });

  it('should deactivate an active OTP and save it', async () => {
    const activeOtp = toOtpDomain(createMockOtpEntity({ active: true }));
    mockRepo.findActiveByAssignee.mockResolvedValue(activeOtp);

    const command = new DeactivateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(mockRepo.findActiveByAssignee).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assigneeId: 'test-assignee',
        category: 'test-category',
      }),
    );
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should register onCommit and onRollback when OTP is found', async () => {
    const activeOtp = toOtpDomain(createMockOtpEntity({ active: true }));
    mockRepo.findActiveByAssignee.mockResolvedValue(activeOtp);

    const command = new DeactivateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(mockTx.trxHandle.onCommit).toHaveBeenCalled();
    expect(mockTx.trxHandle.onRollback).toHaveBeenCalled();
  });

  it('should do nothing when no active OTP exists', async () => {
    mockRepo.findActiveByAssignee.mockResolvedValue(null);

    const command = new DeactivateOtpCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(mockRepo.save).not.toHaveBeenCalled();
    expect(mockTx.trxHandle.onCommit).not.toHaveBeenCalled();
  });
});

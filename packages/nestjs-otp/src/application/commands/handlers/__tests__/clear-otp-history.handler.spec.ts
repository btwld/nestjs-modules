import {
  createMockOtpRepository,
  createMockOtpSettings,
  createMockRepositoryResolver,
  createMockTransaction,
  DEFAULT_OTP_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { OtpPolicy } from '../../../../domain/policies/otp.policy.js';
import { OtpHistoryCleanupService } from '../../../../domain/services/otp-history-cleanup.service.js';
import { type OtpSettingsInterface } from '../../../../infrastructure/config/interfaces/otp-settings.interface.js';
import { ClearOtpHistoryCommand } from '../../impl/clear-otp-history.command.js';
import { ClearOtpHistoryHandler } from '../clear-otp-history.handler.js';

describe(ClearOtpHistoryHandler.name, () => {
  let mockTx: ReturnType<typeof createMockTransaction>;
  let historyCleanup: OtpHistoryCleanupService;

  const ctx = {};

  function makeHandler(
    settingsOverrides: Partial<OtpSettingsInterface> = {},
  ): ClearOtpHistoryHandler {
    const settings = createMockOtpSettings(settingsOverrides);
    return new ClearOtpHistoryHandler(
      mockTx.transaction,
      historyCleanup,
      new OtpPolicy(settings),
    );
  }

  beforeEach(() => {
    const mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);
    mockTx = createMockTransaction();
    historyCleanup = new OtpHistoryCleanupService(mockResolver);
    vi.spyOn(historyCleanup, 'cleanup').mockResolvedValue();
  });

  it('should call cleanup when keepHistoryDays is set', async () => {
    const handler = makeHandler({ keepHistoryDays: 30 });

    const command = new ClearOtpHistoryCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(historyCleanup.cleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assigneeId: 'test-assignee',
        category: 'test-category',
        keepHistoryDays: 30,
      }),
    );
  });

  it('should call cleanup when keepHistoryDays is 0', async () => {
    const handler = makeHandler({ keepHistoryDays: 0 });

    const command = new ClearOtpHistoryCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(historyCleanup.cleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        keepHistoryDays: 0,
      }),
    );
  });

  it('should early return when keepHistoryDays is undefined', async () => {
    const handler = makeHandler({ keepHistoryDays: undefined });

    const command = new ClearOtpHistoryCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(historyCleanup.cleanup).not.toHaveBeenCalled();
  });

  it('should use command keepHistoryDays override over settings', async () => {
    const handler = makeHandler({ keepHistoryDays: 30 });

    const command = new ClearOtpHistoryCommand(
      ctx,
      DEFAULT_OTP_NAMESPACE,
      { assigneeId: 'test-assignee', category: 'test-category' },
      { keepHistoryDays: 7 },
    );

    await handler.execute(command);

    expect(historyCleanup.cleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        keepHistoryDays: 7,
      }),
    );
  });

  it('should use command keepHistoryDays of 0 to override settings', async () => {
    const handler = makeHandler({ keepHistoryDays: 30 });

    const command = new ClearOtpHistoryCommand(
      ctx,
      DEFAULT_OTP_NAMESPACE,
      { assigneeId: 'test-assignee', category: 'test-category' },
      { keepHistoryDays: 0 },
    );

    await handler.execute(command);

    expect(historyCleanup.cleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        keepHistoryDays: 0,
      }),
    );
  });

  it('should fall back to settings when command keepHistoryDays is undefined', async () => {
    const handler = makeHandler({ keepHistoryDays: undefined });

    const command = new ClearOtpHistoryCommand(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    await handler.execute(command);

    expect(historyCleanup.cleanup).not.toHaveBeenCalled();
  });
});

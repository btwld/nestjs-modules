import {
  createMockEventContext,
  createMockOtpEntity,
  createMockOtpRepository,
  createMockOtpSettings,
  createMockRepositoryResolver,
  createMockTransaction,
} from '../../../__tests__/helpers/mock.helpers.js';
import { OtpCreatedEvent } from '../../../domain/events/otp-created.event.js';
import { OtpPolicy } from '../../../domain/policies/otp.policy.js';
import { OtpHistoryCleanupService } from '../../../domain/services/otp-history-cleanup.service.js';
import { type OtpSettingsInterface } from '../../../infrastructure/config/interfaces/otp-settings.interface.js';
import { OtpHistoryCleanupListener } from '../otp-history-cleanup.listener.js';

describe(OtpHistoryCleanupListener.name, () => {
  let mockTx: ReturnType<typeof createMockTransaction>;
  let historyCleanup: OtpHistoryCleanupService;

  function makeListener(
    settingsOverrides: Partial<OtpSettingsInterface> = {},
  ): OtpHistoryCleanupListener {
    const settings = createMockOtpSettings(settingsOverrides);
    return new OtpHistoryCleanupListener(
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
    const listener = makeListener({ keepHistoryDays: 30 });

    const eventContext = createMockEventContext();
    const otp = createMockOtpEntity();
    const event = new OtpCreatedEvent(eventContext, otp);

    await listener.handle(event);

    expect(historyCleanup.cleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assigneeId: otp.assigneeId,
        category: otp.category,
        keepHistoryDays: 30,
      }),
    );
  });

  it('should skip cleanup when keepHistoryDays is undefined', async () => {
    const listener = makeListener({ keepHistoryDays: undefined });

    const eventContext = createMockEventContext();
    const otp = createMockOtpEntity();
    const event = new OtpCreatedEvent(eventContext, otp);

    await listener.handle(event);

    expect(historyCleanup.cleanup).not.toHaveBeenCalled();
  });
});

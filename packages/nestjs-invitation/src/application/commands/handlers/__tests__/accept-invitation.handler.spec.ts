import { createMockInvitationService } from '../../../../__tests__/helpers/mock.helpers.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { AcceptInvitationCommand } from '../../impl/accept-invitation.command.js';
import { AcceptInvitationHandler } from '../accept-invitation.handler.js';

describe(AcceptInvitationHandler.name, () => {
  const ctx = {};
  let mockService: ReturnType<typeof createMockInvitationService>;
  let handler: AcceptInvitationHandler;

  const mockInvitation = new Invitation('inv-id', {
    code: 'test-code',
    category: 'user',
    userId: 'test-user-id',
    constraints: undefined,
    dateAccepted: new Date(),
    dateRevoked: null,
  });

  beforeEach(() => {
    mockService = createMockInvitationService();
    handler = new AcceptInvitationHandler(mockService);
  });

  it('should delegate to InvitationService.accept', async () => {
    mockService.accept.mockResolvedValue(mockInvitation);

    const result = await handler.execute(
      new AcceptInvitationCommand(ctx, 'test-code', {
        passcode: 'abc123',
      }),
    );

    expect(result).toBeInstanceOf(Invitation);
    expect(mockService.accept).toHaveBeenCalledWith(
      ctx,
      'test-code',
      'abc123',
      undefined,
    );
  });

  it('should pass payload to service', async () => {
    mockService.accept.mockResolvedValue(mockInvitation);
    const payload = { extra: 'data' };

    await handler.execute(
      new AcceptInvitationCommand(ctx, 'test-code', {
        passcode: 'abc123',
        payload,
      }),
    );

    expect(mockService.accept).toHaveBeenCalledWith(
      ctx,
      'test-code',
      'abc123',
      payload,
    );
  });

  it('should return null when service returns null', async () => {
    mockService.accept.mockResolvedValue(null);

    const result = await handler.execute(
      new AcceptInvitationCommand(ctx, 'test-code', {
        passcode: 'bad',
      }),
    );

    expect(result).toBeNull();
  });
});

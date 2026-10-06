import { createMockInvitationService } from '../../../../__tests__/helpers/mock.helpers.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { CreateInvitationCommand } from '../../impl/create-invitation.command.js';
import { CreateInvitationHandler } from '../create-invitation.handler.js';

describe(CreateInvitationHandler.name, () => {
  const ctx = {};
  let mockService: ReturnType<typeof createMockInvitationService>;
  let handler: CreateInvitationHandler;

  beforeEach(() => {
    mockService = createMockInvitationService();
    handler = new CreateInvitationHandler(mockService);
  });

  it('should delegate to InvitationService.create', async () => {
    const dto = {
      code: 'test-code',
      category: 'user',
      userId: 'test-user-id',
      constraints: undefined,
    };

    const mockInvitation = new Invitation('inv-id', {
      code: 'test-code',
      category: 'user',
      userId: 'test-user-id',
      constraints: undefined,
      dateAccepted: null,
      dateRevoked: null,
    });
    mockService.create.mockResolvedValue(mockInvitation);

    const result = await handler.execute(new CreateInvitationCommand(ctx, dto));

    expect(result).toBeInstanceOf(Invitation);
    expect(mockService.create).toHaveBeenCalledWith(ctx, dto);
  });
});

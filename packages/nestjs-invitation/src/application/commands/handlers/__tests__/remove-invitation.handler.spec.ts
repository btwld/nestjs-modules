import {
  createMockInvitationService,
  createMockInvitationEntity,
  toInvitationDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { RemoveInvitationCommand } from '../../impl/remove-invitation.command.js';
import { RemoveInvitationHandler } from '../remove-invitation.handler.js';

describe(RemoveInvitationHandler.name, () => {
  const ctx = {};
  let mockService: ReturnType<typeof createMockInvitationService>;
  let handler: RemoveInvitationHandler;

  beforeEach(() => {
    mockService = createMockInvitationService();
    handler = new RemoveInvitationHandler(mockService);
  });

  it('should delegate to InvitationService.remove', async () => {
    const invitation = toInvitationDomain(createMockInvitationEntity());
    mockService.remove.mockResolvedValue(invitation);

    const result = await handler.execute(
      new RemoveInvitationCommand(ctx, 'test-id'),
    );

    expect(result).toBeInstanceOf(Invitation);
    expect(mockService.remove).toHaveBeenCalledWith(ctx, 'test-id');
  });
});

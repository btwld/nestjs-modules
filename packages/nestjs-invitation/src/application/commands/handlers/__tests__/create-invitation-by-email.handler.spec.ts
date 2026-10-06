import {
  createMockInvitationService,
  createMockInvitationEntity,
  toInvitationDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Invitation } from '../../../../domain/aggregates/invitation.js';
import { CreateInvitationByEmailCommand } from '../../impl/create-invitation-by-email.command.js';
import { CreateInvitationByEmailHandler } from '../create-invitation-by-email.handler.js';

describe(CreateInvitationByEmailHandler.name, () => {
  const ctx = {};
  let mockService: ReturnType<typeof createMockInvitationService>;
  let handler: CreateInvitationByEmailHandler;

  beforeEach(() => {
    mockService = createMockInvitationService();
    handler = new CreateInvitationByEmailHandler(mockService);
  });

  it('should delegate to InvitationService.createByEmail', async () => {
    const invitation = toInvitationDomain(createMockInvitationEntity());
    mockService.createByEmail.mockResolvedValue(invitation);

    const dto = {
      email: 'test@example.com',
      category: 'user',
      constraints: { role: 'admin' },
    };

    const result = await handler.execute(
      new CreateInvitationByEmailCommand(ctx, dto),
    );

    expect(result).toBeInstanceOf(Invitation);
    expect(mockService.createByEmail).toHaveBeenCalledWith(ctx, dto);
  });
});

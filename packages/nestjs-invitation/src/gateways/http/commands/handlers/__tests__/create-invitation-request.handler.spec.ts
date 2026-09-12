import {
  createMockCommandBus,
  createMockInvitationEntity,
  toInvitationDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { CreateInvitationCommand } from '../../../../../application/commands/impl/create-invitation.command.js';
import { type InvitationCreatableInterface } from '../../../../../domain/interfaces/invitation-creatable.interface.js';
import { CreateInvitationRequest } from '../../impl/create-invitation.request.js';
import { CreateInvitationRequestHandler } from '../create-invitation-request.handler.js';

describe(CreateInvitationRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: CreateInvitationRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new CreateInvitationRequestHandler(commandBus as never);
  });

  it('should return a plain object from toPlain()', async () => {
    const entity = createMockInvitationEntity();
    commandBus.execute.mockResolvedValue(toInvitationDomain(entity));

    const context = { entity: 'Invitation' } as never;
    const dto: InvitationCreatableInterface = {
      code: 'test-code',
      category: 'user',
      userId: 'test-user-id',
    };

    const result = await handler.execute(
      new CreateInvitationRequest(context, dto),
    );

    expect(result.id).toBe('test-id');
    expect(result.code).toBe('test-code');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateInvitationCommand),
    );
  });
});

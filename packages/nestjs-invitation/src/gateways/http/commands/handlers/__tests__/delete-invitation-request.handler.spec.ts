import { Operation } from '@concepta/nestjs-core';

import {
  createMockCommandBus,
  createMockInvitationEntity,
  toInvitationDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { RemoveInvitationCommand } from '../../../../../application/commands/impl/remove-invitation.command.js';
import { DeleteInvitationRequest } from '../../impl/delete-invitation.request.js';
import { DeleteInvitationRequestHandler } from '../delete-invitation-request.handler.js';

describe(DeleteInvitationRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: DeleteInvitationRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new DeleteInvitationRequestHandler(commandBus as never);
  });

  it('should return null when returnDeleted is false', async () => {
    commandBus.execute.mockResolvedValue(
      toInvitationDomain(createMockInvitationEntity()),
    );

    const context = {
      entity: 'Invitation',
      params: { id: 'test-id' },
      operation: Operation.Delete,
      options: { route: { returnDeleted: false } },
    } as never;

    const result = await handler.execute(new DeleteInvitationRequest(context));

    expect(result).toBeNull();
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(RemoveInvitationCommand),
    );
  });

  it('should return plain object when returnDeleted is true', async () => {
    commandBus.execute.mockResolvedValue(
      toInvitationDomain(createMockInvitationEntity()),
    );

    const context = {
      entity: 'Invitation',
      params: { id: 'test-id' },
      operation: Operation.Delete,
      options: { route: { returnDeleted: true } },
    } as never;

    const result = await handler.execute(new DeleteInvitationRequest(context));

    expect(result).not.toBeNull();
    expect(result!.id).toBe('test-id');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(RemoveInvitationCommand),
    );
  });

  it('should throw when id is not a string', async () => {
    const context = {
      entity: 'Invitation',
      params: { id: 42 },
      operation: Operation.Delete,
      options: { route: { returnDeleted: false } },
    } as never;

    await expect(
      handler.execute(new DeleteInvitationRequest(context)),
    ).rejects.toThrow();
  });
});

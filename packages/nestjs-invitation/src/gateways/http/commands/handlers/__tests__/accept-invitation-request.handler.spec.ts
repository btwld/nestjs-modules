import { HttpStatus } from '@nestjs/common';

import { createMockCommandBus } from '@concepta/nestjs-core/testing';

import {
  createMockInvitationEntity,
  toInvitationDomain,
} from '../../../../../__tests__/helpers/mock.helpers.js';
import { InvitationNotFoundException } from '../../../../../application/exceptions/invitation-not-found.exception.js';
import { type InvitationAcceptableInterface } from '../../../../../domain/interfaces/invitation-acceptable.interface.js';
import { InvitationNotAcceptedException } from '../../../../exceptions/invitation-not-accepted.exception.js';
import { AcceptInvitationRequest } from '../../impl/accept-invitation.request.js';
import { AcceptInvitationRequestHandler } from '../accept-invitation-request.handler.js';

describe(AcceptInvitationRequestHandler.name, () => {
  let commandBus: ReturnType<typeof createMockCommandBus>;
  let handler: AcceptInvitationRequestHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new AcceptInvitationRequestHandler(commandBus as never);
  });

  it('should not throw when acceptance succeeds', async () => {
    const invitation = toInvitationDomain(createMockInvitationEntity());
    commandBus.execute.mockResolvedValue(invitation);

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'test-passcode',
      payload: { newPassword: 'secret123' },
    };

    await expect(
      handler.execute(new AcceptInvitationRequest(context, dto)),
    ).resolves.not.toThrow();

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('should throw InvitationNotAcceptedException when acceptance returns null', async () => {
    commandBus.execute.mockResolvedValue(null);

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'wrong-passcode',
    };

    await expect(
      handler.execute(new AcceptInvitationRequest(context, dto)),
    ).rejects.toThrow(InvitationNotAcceptedException);
  });

  it('should throw a client-fault BAD_REQUEST when acceptance returns null', async () => {
    commandBus.execute.mockResolvedValue(null);

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'wrong-passcode',
    };

    try {
      await handler.execute(new AcceptInvitationRequest(context, dto));
      throw new Error('Expected InvitationNotAcceptedException');
    } catch (e) {
      expect(e).toBeInstanceOf(InvitationNotAcceptedException);
      expect((e as InvitationNotAcceptedException).httpStatus).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect((e as InvitationNotAcceptedException).fault).toBe('client');
    }
  });

  it('should throw InvitationNotAcceptedException with originalError when command throws', async () => {
    const originalError = new Error('domain error');
    commandBus.execute.mockRejectedValue(originalError);

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'test-passcode',
    };

    await expect(
      handler.execute(new AcceptInvitationRequest(context, dto)),
    ).rejects.toThrow(InvitationNotAcceptedException);
  });

  it('should throw an internal-fault 500 when the command throws an unexpected error', async () => {
    commandBus.execute.mockRejectedValue(new Error('domain error'));

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'test-passcode',
    };

    try {
      await handler.execute(new AcceptInvitationRequest(context, dto));
      throw new Error('Expected InvitationNotAcceptedException');
    } catch (e) {
      expect(e).toBeInstanceOf(InvitationNotAcceptedException);
      expect((e as InvitationNotAcceptedException).httpStatus).toBe(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect((e as InvitationNotAcceptedException).fault).toBe('internal');
    }
  });

  it('should propagate an HttpException thrown by the command unchanged', async () => {
    commandBus.execute.mockRejectedValue(
      new InvitationNotFoundException('test-code'),
    );

    const context = {
      entity: 'invitation',
      params: { code: 'test-code' },
    } as never;
    const dto: InvitationAcceptableInterface = {
      passcode: 'test-passcode',
    };

    await expect(
      handler.execute(new AcceptInvitationRequest(context, dto)),
    ).rejects.toThrow(InvitationNotFoundException);
  });
});

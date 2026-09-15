import { randomUUID } from 'crypto';

import {
  HttpStatus,
  Inject,
  Injectable,
  PlainLiteralObject,
} from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import {
  createEventContext,
  EventContextHeadersInterface,
  EventContextHost,
  ReferenceId,
} from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { InvitationNotFoundException } from '../../application/exceptions/invitation-not-found.exception.js';
import { InvitationUserUndefinedException } from '../../application/exceptions/invitation-user-undefined.exception.js';
import { INVITATION_MODULE_REPOSITORY_TOKEN } from '../../invitation.constants.js';
import { Invitation } from '../aggregates/invitation.js';
import { InvitationDispatchedMetadataInterface } from '../events/interfaces/invitation-dispatched-metadata.interface.js';
import { InvitationException } from '../exceptions/invitation.exception.js';
import { InvitationCreatableByEmailInterface } from '../interfaces/invitation-creatable-by-email.interface.js';
import { InvitationCreatableInterface } from '../interfaces/invitation-creatable.interface.js';
import { InvitationOtpPort } from '../ports/invitation-otp.port.js';
import { InvitationUserPort } from '../ports/invitation-user.port.js';
import { InvitationRepositoryInterface } from '../repositories/invitation-repository.interface.js';

@Injectable()
export class InvitationService {
  constructor(
    @Inject(INVITATION_MODULE_REPOSITORY_TOKEN)
    private readonly invitationRepo: InvitationRepositoryInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly otpPort: InvitationOtpPort,
    private readonly userPort: InvitationUserPort,
  ) {}

  async create(
    ctx: PlainLiteralObject,
    dto: InvitationCreatableInterface,
  ): Promise<Invitation> {
    return this.txScope.run(ctx, async (txCtx) => {
      const eventContext = createEventContext(txCtx, {}, {});

      const invitation = this.eventPublisher.mergeObjectContext(
        Invitation.create(eventContext, dto),
      );

      await this.invitationRepo.save(txCtx, invitation);

      await this.send(txCtx, invitation);

      txCtx.trx.onCommit(() => invitation.commit());
      txCtx.trx.onRollback(() => invitation.uncommit());

      return invitation;
    });
  }

  async createByEmail(
    ctx: PlainLiteralObject,
    dto: InvitationCreatableByEmailInterface,
  ): Promise<Invitation> {
    return this.txScope.run(ctx, async (txCtx) => {
      const { email, category, constraints } = dto;

      const user = await this.userPort.getByEmail(txCtx, email);

      if (!user) {
        // No user for a caller-supplied email — a client mistake, not a
        // wiring problem.
        throw new InvitationUserUndefinedException({
          safeMessage: 'No user found for the given email',
          httpStatus: HttpStatus.BAD_REQUEST,
          fault: 'client',
        });
      }

      return this.create(txCtx, {
        userId: user.id,
        code: randomUUID(),
        category,
        constraints,
      });
    });
  }

  async send(ctx: PlainLiteralObject, invitation: Invitation): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      const { category, userId } = invitation;

      const user = await this.userPort.getById(txCtx, userId);

      if (!user) {
        // userId came from the invitation row, not caller input — a
        // dangling reference is a wiring/data problem. Leave fault at the
        // class default ('usage').
        throw new InvitationUserUndefinedException();
      }

      const otp = await this.otpPort.create(txCtx, category, userId);

      const eventContext = createEventContext<
        PlainLiteralObject,
        InvitationDispatchedMetadataInterface
      >(
        txCtx,
        {},
        {
          passcode: otp.passcode,
          tokenExp: otp.expirationDate,
        },
      );

      const merged = this.eventPublisher.mergeObjectContext(invitation);
      merged.dispatch(eventContext);

      txCtx.trx.onCommit(() => merged.commit());
      txCtx.trx.onRollback(() => merged.uncommit());
    });
  }

  async sendById(
    ctx: PlainLiteralObject,
    invitationId: ReferenceId,
  ): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      const invitation = await this.invitationRepo.get(txCtx, invitationId);

      if (!invitation) {
        throw new InvitationNotFoundException(invitationId);
      }

      await this.send(txCtx, invitation);
    });
  }

  async accept(
    ctx: PlainLiteralObject,
    code: string,
    passcode: string,
    payload?: PlainLiteralObject,
  ): Promise<Invitation | null> {
    return this.txScope.run(ctx, async (txCtx) => {
      let invitation;

      try {
        invitation = await this.invitationRepo.findOneByCode(txCtx, code);
      } catch (e: unknown) {
        throw new InvitationException({ originalError: e });
      }

      if (!invitation) {
        throw new InvitationNotFoundException(
          code,
          'Invitation not found for code=%s',
        );
      }

      const { category } = invitation;

      const otp = await this.otpPort.consume(txCtx, category, passcode);

      if (!otp) {
        return null;
      }

      const eventContext = createEventContext(txCtx, {}, {});

      const merged = this.eventPublisher.mergeObjectContext(invitation);
      merged.accept(eventContext, payload);

      await this.invitationRepo.save(txCtx, merged);

      // revoke all other active invitations for this user+category
      await this.revokeByUserId(txCtx, invitation.userId, category);

      txCtx.trx.onCommit(() => merged.commit());
      txCtx.trx.onRollback(() => merged.uncommit());

      return merged;
    });
  }

  async remove(ctx: PlainLiteralObject, id: ReferenceId): Promise<Invitation> {
    return this.txScope.run(ctx, async (txCtx) => {
      const invitation = await this.invitationRepo.get(txCtx, id);

      if (!invitation) {
        throw new InvitationNotFoundException(String(id));
      }

      const eventContext = createEventContext(txCtx, {}, {});

      const merged = this.eventPublisher.mergeObjectContext(invitation);
      merged.remove(eventContext);

      await this.invitationRepo.remove(txCtx, merged);

      txCtx.trx.onCommit(() => merged.commit());
      txCtx.trx.onRollback(() => merged.uncommit());

      return merged;
    });
  }

  async revokeByEmail(
    ctx: PlainLiteralObject,
    email: string,
    category: string,
  ): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      const user = await this.userPort.getByEmail(txCtx, email);

      if (!user) {
        // No user for a caller-supplied email — a client mistake, not a
        // wiring problem.
        throw new InvitationUserUndefinedException({
          safeMessage: 'No user found for the given email',
          httpStatus: HttpStatus.BAD_REQUEST,
          fault: 'client',
        });
      }

      await this.revokeByUserId(txCtx, user.id, category);
    });
  }

  async revokeByUserId(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    category: string,
  ): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      const invitations = await this.invitationRepo.findAllByUserAndCategory(
        txCtx,
        userId,
        category,
      );

      const activeInvitations = invitations.filter((inv) => inv.active);

      if (activeInvitations.length === 0) {
        return;
      }

      const eventContext = createEventContext(txCtx, {}, {});

      await this.revokeActive(txCtx, eventContext, activeInvitations);
    });
  }

  protected async revokeActive(
    ctx: PlainLiteralObject,
    eventContext: EventContextHost<EventContextHeadersInterface>,
    invitations: Invitation[],
  ): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      for (const invitation of invitations) {
        const merged = this.eventPublisher.mergeObjectContext(invitation);
        merged.revoke(eventContext);
        await this.invitationRepo.save(txCtx, merged);
        txCtx.trx.onCommit(() => merged.commit());
        txCtx.trx.onRollback(() => merged.uncommit());
      }
    });
  }
}

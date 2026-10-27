import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { DeactivateOtpCommand } from '../impl/deactivate-otp.command.js';

@CommandHandler(DeactivateOtpCommand)
export class DeactivateOtpHandler implements ICommandHandler<DeactivateOtpCommand> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: DeactivateOtpCommand): Promise<void> {
    const { ctx, namespace, otp } = command;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    return this.txScope.run(ctx, async (txCtx) => {
      const activeOtp = await otpRepo.findActiveByAssignee(txCtx, {
        assigneeId: otp.assigneeId,
        category: otp.category,
      });

      if (activeOtp) {
        const eventContext = createEventContext(txCtx, { namespace }, {});

        const aggregate = this.eventPublisher.mergeObjectContext(activeOtp);
        aggregate.deactivate(eventContext);
        await otpRepo.save(txCtx, aggregate);

        txCtx.trx.onCommit(() => aggregate.commit());
        txCtx.trx.onRollback(() => aggregate.uncommit());
      }
    });
  }
}

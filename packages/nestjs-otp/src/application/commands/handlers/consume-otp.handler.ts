import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import {
  AssigneeRelationInterface,
  createEventContext,
} from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { OtpPolicy } from '../../../domain/policies/otp.policy.js';
import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { ConsumeOtpCommand } from '../impl/consume-otp.command.js';

@CommandHandler(ConsumeOtpCommand)
export class ConsumeOtpHandler implements ICommandHandler<
  ConsumeOtpCommand,
  AssigneeRelationInterface | null
> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly policy: OtpPolicy,
  ) {}

  async execute(
    command: ConsumeOtpCommand,
  ): Promise<AssigneeRelationInterface | null> {
    const { ctx, namespace, otp } = command;
    const { category, passcode } = otp;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    let result: AssigneeRelationInterface | null = null;

    await this.txScope.run(ctx, async (txCtx) => {
      const activeOtp = await otpRepo.findActiveByPasscode(txCtx, {
        category,
        passcode,
      });

      if (!activeOtp || activeOtp.isExpired()) {
        return;
      }

      const { type } = activeOtp;
      const typeService = this.policy.resolveTypeService(type);

      if (!typeService.validator(passcode, activeOtp.passcode)) {
        return;
      }

      const eventContext = createEventContext(txCtx, { namespace }, {});

      this.eventPublisher.mergeObjectContext(activeOtp);

      activeOtp.consume(eventContext);

      await otpRepo.remove(txCtx, activeOtp);

      txCtx.trx.onCommit(() => activeOtp.commit());
      txCtx.trx.onRollback(() => activeOtp.uncommit());

      result = { assigneeId: activeOtp.assigneeId };
    });

    return result;
  }
}

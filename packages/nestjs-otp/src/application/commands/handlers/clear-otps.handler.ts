import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { ClearOtpsCommand } from '../impl/clear-otps.command.js';

@CommandHandler(ClearOtpsCommand)
export class ClearOtpsHandler implements ICommandHandler<ClearOtpsCommand> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: ClearOtpsCommand): Promise<void> {
    const { ctx, namespace, otp } = command;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    return this.txScope.run(ctx, async (txCtx) => {
      const otps = await otpRepo.findAllByAssigneeAndCategory(txCtx, {
        assigneeId: otp.assigneeId,
        category: otp.category,
      });

      if (otps.length > 0) {
        await otpRepo.removeAll(txCtx, otps);
      }
    });
  }
}

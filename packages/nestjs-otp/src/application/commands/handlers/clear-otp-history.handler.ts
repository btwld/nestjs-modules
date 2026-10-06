import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { OtpPolicy } from '../../../domain/policies/otp.policy.js';
import { OtpHistoryCleanupService } from '../../../domain/services/otp-history-cleanup.service.js';
import { ClearOtpHistoryCommand } from '../impl/clear-otp-history.command.js';

@CommandHandler(ClearOtpHistoryCommand)
export class ClearOtpHistoryHandler implements ICommandHandler<ClearOtpHistoryCommand> {
  constructor(
    private readonly txScope: TransactionScope,
    private readonly historyCleanup: OtpHistoryCleanupService,
    private readonly policy: OtpPolicy,
  ) {}

  async execute(command: ClearOtpHistoryCommand): Promise<void> {
    const { ctx, namespace, otp } = command;
    const { assigneeId, category } = otp;

    const keepHistoryDays = this.policy.resolveKeepHistoryDays(
      command.keepHistoryDays,
    );

    if (keepHistoryDays === undefined) return;

    return this.txScope.run(ctx, async (txCtx) => {
      await this.historyCleanup.cleanup(txCtx, {
        namespace,
        assigneeId,
        category,
        keepHistoryDays,
      });
    });
  }
}

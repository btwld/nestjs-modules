import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { AppContextHost, CorrelationCtx } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { OtpCreatedEvent } from '../../domain/events/otp-created.event.js';
import { OtpPolicy } from '../../domain/policies/otp.policy.js';
import { OtpHistoryCleanupService } from '../../domain/services/otp-history-cleanup.service.js';

@EventsHandler(OtpCreatedEvent)
export class OtpHistoryCleanupListener implements IEventHandler<OtpCreatedEvent> {
  constructor(
    private readonly txScope: TransactionScope,
    private readonly historyCleanup: OtpHistoryCleanupService,
    private readonly policy: OtpPolicy,
  ) {}

  async handle(event: OtpCreatedEvent): Promise<void> {
    const {
      eventContext,
      otp: { assigneeId, category },
    } = event;
    const { namespace } = eventContext.headers;
    const keepHistoryDays = this.policy.resolveKeepHistoryDays();

    if (keepHistoryDays === undefined) return;

    const appCtx = new AppContextHost();
    appCtx.defineOverlay(CorrelationCtx, {
      correlationId: eventContext.getHeader('correlationId'),
      causationId: eventContext.getHeader('causationId'),
    });

    await this.txScope.run(appCtx, async (txCtx) => {
      await this.historyCleanup.cleanup(txCtx, {
        namespace,
        assigneeId,
        category,
        keepHistoryDays,
      });
    });
  }
}

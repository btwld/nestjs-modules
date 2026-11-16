import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';

import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../otp.constants.js';
import { OtpRepositoryResolverInterface } from '../repositories/otp-repository-resolver.interface.js';

@Injectable()
export class OtpHistoryCleanupService {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
  ) {}

  async cleanup(
    ctx: PlainLiteralObject,
    options: {
      namespace: string;
      assigneeId: string;
      category: string;
      keepHistoryDays: number;
    },
  ): Promise<void> {
    const { namespace, assigneeId, category, keepHistoryDays } = options;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepHistoryDays);

    const oldOtps = await otpRepo.findOlderThan(ctx, {
      assigneeId,
      category,
      cutoffDate,
    });

    if (oldOtps.length > 0) {
      await otpRepo.removeAll(ctx, oldOtps);
    }
  }
}
